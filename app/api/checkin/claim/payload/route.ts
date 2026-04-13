import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import CheckInService from "@/lib/services/checkin.service";

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-claim-debug-id") || randomUUID();

  try {
    console.info("[ClaimFlow][API][payload] start", { requestId });

    await dbConnect();

    const user = await authenticateWalletUser(request);
    console.info("[ClaimFlow][API][payload] authenticated", {
      requestId,
      wallet: maskAddress(user.walletAddress),
    });

    const checkInService = new CheckInService();

    const claim = await checkInService.getFreshClaimPayload(user.walletAddress);

    console.info("[ClaimFlow][API][payload] generated", {
      requestId,
      wallet: maskAddress(user.walletAddress),
      day: claim.day,
      deadline: claim.deadline,
      nonce: claim.nonce,
      signatureLength: claim.signature.length,
      secondsUntilExpiry: claim.deadline - Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({
      success: true,
      claim,
    });
  } catch (error: any) {
    console.error("[ClaimFlow][API][payload] error", {
      requestId,
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    return NextResponse.json(
      { message: error.message || "Failed to create check-in claim payload" },
      { status: error.status || 500 }
    );
  }
}
