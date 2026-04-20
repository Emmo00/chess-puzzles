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
import CheckInSigningService from "@/lib/services/checkin-signing.service";
import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const toJsonSafe = <T>(value: T): T => {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue
    )
  ) as T;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-claim-debug-id") || randomUUID();

  try {
    console.info("[ClaimFlow][API][sponsored] start", { requestId });

    const user = await authenticateWalletUser(request);
    const deviceFingerprint = getDeviceFingerprintFromRequest(request);
    const clientIp = getClientIp(request);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "checkin.claim.sponsored",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 12, windowMs: 60_000 },
        { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 6, windowMs: 60_000 },
        { scopeSuffix: "device", key: deviceFingerprint, maxRequests: 4, windowMs: 60_000 },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    console.info("[ClaimFlow][API][sponsored] input", {
      requestId,
      wallet: maskAddress(user.walletAddress),
    });

    const normalizedWallet = user.walletAddress.toLowerCase();

    const checkInService = new CheckInService();
    const claim = await checkInService.getFreshClaimPayload(
      normalizedWallet,
      deviceFingerprint
    );

    const contractService = new CheckInContractService();
    const publicClient = contractService.getPublicClient();

    const [onChainSigner, onChainNonce] = await Promise.all([
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "serverSigner",
      }),
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "checkInNonces",
        args: [normalizedWallet as `0x${string}`],
      }),
    ]);

    if (BigInt(claim.nonce) !== onChainNonce) {
      return NextResponse.json(
        {
          message: "Claim nonce is stale. Refresh and try again.",
          expectedNonce: onChainNonce.toString(),
        },
        { status: 409 }
      );
    }

    const signingService = new CheckInSigningService();
    const relayerAccount = signingService.getSignerAccount();

    if (relayerAccount.address.toLowerCase() !== String(onChainSigner).toLowerCase()) {
      return NextResponse.json(
        { message: "Relayer wallet does not match contract server signer" },
        { status: 500 }
      );
    }

    const walletClient = createWalletClient({
      account: relayerAccount,
      chain: celo,
      transport: http(process.env.CELO_RPC_URL || undefined),
    });

    const relayTxRequest = {
      address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
      abi: PAYOUT_CLAIMS_ABI,
      functionName: "claimDailyCheckIn" as const,
      args: [
        normalizedWallet as `0x${string}`,
        BigInt(claim.day),
        BigInt(claim.nonce),
        BigInt(claim.deadline),
        claim.signature,
      ] as const,
      chain: celo,
      account: relayerAccount,
    };

    console.info("[ClaimFlow][API][sponsored] relay.txRequest.full", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      relayer: relayerAccount.address,
      relayTxRequest,
      claim,
    });

    const txHash = await walletClient.writeContract(relayTxRequest);

    await checkInService.markClaiming(
      normalizedWallet,
      txHash,
      deviceFingerprint
    );

    let receipt: Awaited<
      ReturnType<ReturnType<CheckInContractService["getPublicClient"]>["waitForTransactionReceipt"]>
    > | null = null;

    try {
      receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 45_000,
      });
    } catch {
      receipt = null;
    }

    if (!receipt) {
      return NextResponse.json(
        {
          success: false,
          pending: true,
          txHash,
          message: "Transaction submitted, confirmation pending",
        },
        { status: 202 }
      );
    }

    if (receipt.status !== "success") {
      await checkInService.markFailedClaim(
        normalizedWallet,
        txHash,
        "Sponsored transaction reverted"
      );

      const safeReceipt = toJsonSafe(receipt);

      return NextResponse.json(
        {
          success: false,
          txHash,
          receipt: safeReceipt,
          message: "Sponsored transaction reverted",
        },
        { status: 400 }
      );
    }

    const claimedReservation = await checkInService.markClaimed(normalizedWallet, txHash);

    console.info("[ClaimFlow][API][sponsored] submitted", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      relayer: relayerAccount.address,
      txHash,
      claimedAt: claimedReservation.claimedAt,
    });

    return NextResponse.json({
      success: true,
      txHash,
      relayer: relayerAccount.address,
      claimedAt: claimedReservation.claimedAt,
      receipt: toJsonSafe(receipt),
    });
  } catch (error: any) {
    console.error("[ClaimFlow][API][sponsored] error", {
      requestId,
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });

    return NextResponse.json(
      { message: error?.message || "Failed to submit sponsored claim transaction" },
      { status: error?.status || 500 }
    );
  }
}
