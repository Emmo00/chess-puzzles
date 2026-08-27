import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { decodeFunctionData } from "viem";

import dbConnect from "../../lib/db";
import CheckInService from "../../lib/services/checkin.service";
import CheckInContractService from "../../lib/services/checkin-contract.service";
import { authenticateWallet } from "../../middleware/auth";
import { PAYOUT_CLAIMS_ABI } from "../../lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT } from "../../lib/config/wagmi";
import { devErrorBody } from "../../lib/utils/devResponse";

const router = Router();

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const requestId = (req.headers["x-claim-debug-id"] as string) || randomUUID();

  try {
    console.info("[ClaimFlow][API][confirm] start", { requestId });

    await dbConnect();

    const { txHash } = req.body;

    console.info("[ClaimFlow][API][confirm] input", {
      requestId,
      wallet: maskAddress(req.walletAddress),
      txHash,
    });

    if (!txHash || typeof txHash !== "string" || !TX_HASH_REGEX.test(txHash)) {
      console.info("[ClaimFlow][API][confirm] invalidTxHash", {
        requestId,
        txHash,
      });
      res.status(400).json({ message: "Invalid txHash provided" });
      return;
    }

    const checkInService = new CheckInService();
    const contractService = new CheckInContractService();

    const deviceFingerprint = (req.headers["x-device-fingerprint"] as string) || undefined;

    const reservation = await checkInService.markClaiming(
      req.walletAddress!,
      txHash,
      deviceFingerprint
    );
    console.info("[ClaimFlow][API][confirm] markClaiming", {
      requestId,
      wallet: maskAddress(req.walletAddress),
      reservationStatus: reservation.status,
    });

    if (reservation.status === "claimed") {
      res.json({
        success: true,
        alreadyClaimed: true,
        txHash: reservation.claimTxHash,
        claimedAt: reservation.claimedAt,
      });
      return;
    }

    const publicClient = contractService.getPublicClient();

    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      console.info("[ClaimFlow][API][confirm] receipt", {
        requestId,
        txHash,
        status: receipt.status,
        blockNumber: Number(receipt.blockNumber),
      });

      console.info("[ClaimFlow][API][confirm] receiptFull", {
        requestId,
        txHash,
        receipt,
      });
    } catch (error: any) {
      if (error.name === "TransactionReceiptNotFoundError") {
        console.info("[ClaimFlow][API][confirm] receiptPending", {
          requestId,
          txHash,
        });
        res.status(202).json({
          success: false,
          retryable: true,
          message: "Transaction is pending confirmation",
        });
        return;
      }
      throw error;
    }

    if (receipt.status !== "success") {
      console.info("[ClaimFlow][API][confirm] receiptReverted", {
        requestId,
        txHash,
      });

      console.error("[ClaimFlow][API][confirm] transaction reverted", {
        requestId,
        txHash,
        wallet: maskAddress(req.walletAddress),
      });

      res.status(400).json({
        success: false,
        message: "Transaction reverted",
      });
      return;
    }

    const transaction = await publicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    const onChainServerSigner = await publicClient.readContract({
      address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
      abi: PAYOUT_CLAIMS_ABI,
      functionName: "serverSigner",
    });

    let decodedInput: {
      functionName: string;
      args: string[];
    } | null = null;

    try {
      const decoded = decodeFunctionData({
        abi: PAYOUT_CLAIMS_ABI,
        data: transaction.input,
      });

      decodedInput = {
        functionName: decoded.functionName,
        args: (decoded.args || []).map((arg) =>
          typeof arg === "bigint" ? arg.toString() : String(arg)
        ),
      };
    } catch (decodeError: any) {
      decodedInput = {
        functionName: "decode_failed",
        args: [decodeError?.message || "unknown decode error"],
      };
    }

    console.info("[ClaimFlow][API][confirm] txFull", {
      requestId,
      txHash,
      transaction,
      decodedInput,
    });

    const claimFunctionMatches = decodedInput?.functionName === "claimDailyCheckIn";
    const decodedUser = decodedInput?.args?.[0]?.toLowerCase();
    const decodedDay = decodedInput?.args?.[1];
    const decodedNonce = decodedInput?.args?.[2];
    const decodedDeadline = decodedInput?.args?.[3];
    const decodedSignature = decodedInput?.args?.[4];

    const userMatches = decodedUser === req.walletAddress!.toLowerCase();
    const toMatches =
      transaction.to?.toLowerCase() === PAYOUT_CLAIM_CONTRACT.toLowerCase();
    const senderMatchesServerSigner =
      transaction.from.toLowerCase() === String(onChainServerSigner).toLowerCase();
    const senderMatchesUser =
      transaction.from.toLowerCase() === req.walletAddress!.toLowerCase();

    console.info("[ClaimFlow][API][confirm] txValidation", {
      requestId,
      txHash,
      functionName: decodedInput?.functionName,
      decodedUser,
      decodedDay,
      decodedNonce,
      decodedDeadline,
      decodedSignatureLength: decodedSignature?.length,
      from: transaction.from,
      to: transaction.to,
      expectedWallet: req.walletAddress,
      expectedContract: PAYOUT_CLAIM_CONTRACT,
      expectedServerSigner: onChainServerSigner,
      claimFunctionMatches,
      userMatches,
      toMatches,
      senderMatchesServerSigner,
      senderMatchesUser,
    });

    if (!claimFunctionMatches || !userMatches || !toMatches || (!senderMatchesServerSigner && !senderMatchesUser)) {
      console.error("[ClaimFlow][API][confirm] calldata mismatch", {
        requestId,
        txHash,
        wallet: maskAddress(req.walletAddress),
        decodedInput,
      });

      res.status(400).json({
        success: false,
        message: "Transaction does not match expected daily claim call",
      });
      return;
    }

    const claimedReservation = await checkInService.markClaimed(
      req.walletAddress!,
      txHash
    );

    console.info("[ClaimFlow][API][confirm] claimed", {
      requestId,
      wallet: maskAddress(req.walletAddress),
      txHash,
      claimedAt: claimedReservation.claimedAt,
    });

    res.json({
      success: true,
      status: claimedReservation.status,
      txHash,
      claimedAt: claimedReservation.claimedAt,
    });
  } catch (error: any) {
    console.error("[ClaimFlow][API][confirm] error", {
      requestId,
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    res.status(error.status || 500).json({
      message: error.message || "Failed to confirm check-in claim",
      ...devErrorBody(error),
    });
  }
});

export default router;
