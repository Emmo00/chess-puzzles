import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import PuzzleRushService from "@/lib/services/puzzleRush.service";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  let walletAddress: string | undefined;
  const queryWallet = new URL(request.url).searchParams.get("walletAddress");
  if (queryWallet && ADDRESS_REGEX.test(queryWallet)) {
    walletAddress = queryWallet.toLowerCase();
  }

  if (!walletAddress) {
    try {
      const user = await authenticateWalletUser(request);
      walletAddress = user.walletAddress;
    } catch {
      walletAddress = undefined;
    }
  }

  const rateLimitResponse = enforceRateLimitOrResponse({
    endpoint: "puzzle-rush.status",
    rules: [
      { scopeSuffix: "ip", key: clientIp, maxRequests: 90, windowMs: 60_000 },
      {
        scopeSuffix: "wallet",
        key: walletAddress || `anonymous:${clientIp}`,
        maxRequests: 60,
        windowMs: 60_000,
      },
    ],
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await dbConnect();
    const service = new PuzzleRushService();
    const status = await service.getStatus(walletAddress);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch Puzzle Rush status" },
      { status: error.status || 500 }
    );
  }
}