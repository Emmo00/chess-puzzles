import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import PuzzleRushService from "@/lib/services/puzzleRush.service";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/puzzle-rush/session/end", async (req, log) => {
    try {
      const clientIp = getClientIp(req);
      const user = await authenticateWalletUser(req);

      const rateLimitResponse = enforceRateLimitOrResponse({
        endpoint: "puzzle-rush.session.end",
        rules: [
          { scopeSuffix: "ip", key: clientIp, maxRequests: 20, windowMs: 60_000 },
          { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 15, windowMs: 60_000 },
        ],
      });
      if (rateLimitResponse) return rateLimitResponse;

      const body = await req.json();
      if (typeof body?.sessionId !== "string") {
        return NextResponse.json(
          { message: "Invalid request body. Required: sessionId" },
          { status: 400 }
        );
      }

      await dbConnect();
      const service = new PuzzleRushService();
      const payload = await service.endSession(user.walletAddress, body.sessionId);

      log.info("puzzleRush.session.ended", {
        wallet: maskAddress(user.walletAddress),
        sessionId: body.sessionId,
      });

      return NextResponse.json(payload);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("puzzleRush.session.end.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to end Puzzle Rush session" },
        { status: error.status || 500 }
      );
    }
  });
}