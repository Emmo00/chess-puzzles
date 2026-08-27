import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import PuzzleRushService from "@/lib/services/puzzleRush.service";

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  let walletAddress: string | undefined;
  try {
    const user = await authenticateWalletUser(request);
    walletAddress = user.walletAddress;
  } catch {
    walletAddress = undefined;
  }

  const rateLimitResponse = enforceRateLimitOrResponse({
    endpoint: "puzzle-rush.leaderboard",
    rules: [
      { scopeSuffix: "ip", key: clientIp, maxRequests: 60, windowMs: 60_000 },
      {
        scopeSuffix: "wallet",
        key: walletAddress || `anonymous:${clientIp}`,
        maxRequests: 60,
        windowMs: 60_000,
      },
    ],
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") || "all";
  const rawLimit = Number(searchParams.get("limit") || 50);
  const rawOffset = Number(searchParams.get("offset") || 0);

  if (!["all", "today", "week"].includes(periodParam)) {
    return NextResponse.json({ message: "Invalid period" }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 50, 1), 200);
  const offset = Math.max(Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0, 0);

  try {
    await dbConnect();
    const service = new PuzzleRushService();
    const payload = await service.getLeaderboard(
      periodParam as "all" | "today" | "week",
      limit,
      offset,
      walletAddress
    );
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}