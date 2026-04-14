import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { authenticateWalletUser } from "@/lib/auth";
import {
  CHECK_IN_CLAIM_TYPES,
  PAYOUT_CLAIMS_ABI,
  PAYOUT_CLAIMS_EIP712_DOMAIN,
} from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import dbConnect from "@/lib/db";
import CheckInContractService from "@/lib/services/checkin-contract.service";
import CheckInService from "@/lib/services/checkin.service";
import CheckInSigningService from "@/lib/services/checkin-signing.service";
import {
  buildSponsoredCheckinIntentMessage,
  SponsoredCheckinClaimPayload,
} from "@/lib/utils/checkinSponsoredIntent";
import { createWalletClient, http, recoverTypedDataAddress, verifyMessage } from "viem";
import { celo } from "viem/chains";

const TX_SIG_REGEX = /^0x[a-fA-F0-9]+$/;

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const isHexSignature = (value: string) => {
  return TX_SIG_REGEX.test(value) && value.length >= 132;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-claim-debug-id") || randomUUID();

  try {
    console.info("[ClaimFlow][API][sponsored] start", { requestId });

    await dbConnect();

    const user = await authenticateWalletUser(request);
    const body = await request.json();
    const claim = body?.claim as SponsoredCheckinClaimPayload | undefined;
    const intentMessage = body?.intentMessage as string | undefined;
    const intentSignature = body?.intentSignature as `0x${string}` | undefined;

    console.info("[ClaimFlow][API][sponsored] input", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      hasClaim: Boolean(claim),
      hasIntentMessage: Boolean(intentMessage),
      hasIntentSignature: Boolean(intentSignature),
    });

    if (!claim || !intentMessage || !intentSignature) {
      return NextResponse.json(
        { message: "claim, intentMessage, and intentSignature are required" },
        { status: 400 }
      );
    }

    if (!isHexSignature(intentSignature)) {
      return NextResponse.json(
        { message: "intentSignature must be a valid hex signature" },
        { status: 400 }
      );
    }

    const normalizedWallet = user.walletAddress.toLowerCase();
    if (claim.user.toLowerCase() !== normalizedWallet) {
      return NextResponse.json(
        { message: "Claim payload user does not match authenticated wallet" },
        { status: 400 }
      );
    }

    const expectedIntentMessage = buildSponsoredCheckinIntentMessage({
      ...claim,
      user: normalizedWallet as `0x${string}`,
    });

    if (intentMessage !== expectedIntentMessage) {
      return NextResponse.json(
        { message: "Intent message mismatch" },
        { status: 400 }
      );
    }

    const intentValid = await verifyMessage({
      address: normalizedWallet as `0x${string}`,
      message: intentMessage,
      signature: intentSignature,
    });

    if (!intentValid) {
      return NextResponse.json(
        { message: "Intent signature verification failed" },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (claim.deadline <= now) {
      return NextResponse.json(
        { message: "Claim signature expired" },
        { status: 400 }
      );
    }

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

    const recoveredServerSigner = await recoverTypedDataAddress({
      domain: PAYOUT_CLAIMS_EIP712_DOMAIN,
      types: CHECK_IN_CLAIM_TYPES,
      primaryType: "CheckInClaim",
      message: {
        user: normalizedWallet as `0x${string}`,
        day: BigInt(claim.day),
        nonce: BigInt(claim.nonce),
        deadline: BigInt(claim.deadline),
      },
      signature: claim.signature,
    });

    if (recoveredServerSigner.toLowerCase() !== String(onChainSigner).toLowerCase()) {
      return NextResponse.json(
        { message: "Claim signature signer mismatch" },
        { status: 400 }
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
      intentMessage,
      intentSignature,
    });

    const txHash = await walletClient.writeContract(relayTxRequest);

    const checkInService = new CheckInService();
    await checkInService.markClaiming(normalizedWallet, txHash);

    console.info("[ClaimFlow][API][sponsored] submitted", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      relayer: relayerAccount.address,
      txHash,
    });

    return NextResponse.json({
      success: true,
      txHash,
      relayer: relayerAccount.address,
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
