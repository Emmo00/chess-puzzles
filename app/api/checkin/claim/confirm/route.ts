import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { authenticateWalletUser } from "@/lib/auth";
import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import dbConnect from "@/lib/db";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import {
  getClientIp,
  getDeviceFingerprintFromRequest,
} from "@/lib/security/requestProtection";
import CheckInContractService from "@/lib/services/checkin-contract.service";
import CheckInService from "@/lib/services/checkin.service";
import { decodeFunctionData } from "viem";

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-claim-debug-id") || randomUUID();

  try {
    console.info("[ClaimFlow][API][confirm] start", { requestId });

    const user = await authenticateWalletUser(request);
    const deviceFingerprint = getDeviceFingerprintFromRequest(request);
    const clientIp = getClientIp(request);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "checkin.claim.confirm",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 20, windowMs: 60_000 },
        { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 12, windowMs: 60_000 },
        { scopeSuffix: "device", key: deviceFingerprint, maxRequests: 10, windowMs: 60_000 },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    const { txHash } = await request.json();

    console.info("[ClaimFlow][API][confirm] input", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      txHash,
    });

    if (!txHash || typeof txHash !== "string" || !TX_HASH_REGEX.test(txHash)) {
      console.info("[ClaimFlow][API][confirm] invalidTxHash", {
        requestId,
        txHash,
      });
      return NextResponse.json(
        { message: "Invalid txHash provided" },
        { status: 400 }
      );
    }

    const checkInService = new CheckInService();
    const contractService = new CheckInContractService();

    const reservation = await checkInService.markClaiming(
      user.walletAddress,
      txHash,
      deviceFingerprint
    );
    console.info("[ClaimFlow][API][confirm] markClaiming", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      reservationStatus: reservation.status,
    });

    if (reservation.status === "claimed") {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        txHash: reservation.claimTxHash,
        claimedAt: reservation.claimedAt,
      });
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
        return NextResponse.json(
          {
            success: false,
            retryable: true,
            message: "Transaction is pending confirmation",
          },
          { status: 202 }
        );
      }
      throw error;
    }

    if (receipt.status !== "success") {
      console.info("[ClaimFlow][API][confirm] receiptReverted", {
        requestId,
        txHash,
      });

      await checkInService.markFailedClaim(
        user.walletAddress,
        txHash,
        "Transaction reverted"
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transaction reverted",
        },
        { status: 400 }
      );
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

    const userMatches = decodedUser === user.walletAddress.toLowerCase();
    const toMatches =
      transaction.to?.toLowerCase() === PAYOUT_CLAIM_CONTRACT.toLowerCase();
    const senderMatchesServerSigner =
      transaction.from.toLowerCase() === String(onChainServerSigner).toLowerCase();
    const senderMatchesUser =
      transaction.from.toLowerCase() === user.walletAddress.toLowerCase();

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
      expectedWallet: user.walletAddress,
      expectedContract: PAYOUT_CLAIM_CONTRACT,
      expectedServerSigner: onChainServerSigner,
      claimFunctionMatches,
      userMatches,
      toMatches,
      senderMatchesServerSigner,
      senderMatchesUser,
    });

    if (!claimFunctionMatches || !userMatches || !toMatches || (!senderMatchesServerSigner && !senderMatchesUser)) {
      await checkInService.markFailedClaim(
        user.walletAddress,
        txHash,
        "Transaction calldata does not match daily claim"
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transaction does not match expected daily claim call",
        },
        { status: 400 }
      );
    }

    const claimedReservation = await checkInService.markClaimed(
      user.walletAddress,
      txHash
    );

    console.info("[ClaimFlow][API][confirm] claimed", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      txHash,
      claimedAt: claimedReservation.claimedAt,
    });

    return NextResponse.json({
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
    return NextResponse.json(
      { message: error.message || "Failed to confirm check-in claim" },
      { status: error.status || 500 }
    );
  }
}
