import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import PuzzleRushService, {
  RushAccessDeniedError,
} from "@/lib/services/puzzleRush.service";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/puzzle-rush/session/start", async (req, log) => {
    try {
      const clientIp = getClientIp(req);
      const user = await authenticateWalletUser(req);

      const rateLimitResponse = enforceRateLimitOrResponse({
        endpoint: "puzzle-rush.session.start",
        rules: [
          { scopeSuffix: "ip", key: clientIp, maxRequests: 20, windowMs: 60_000 },
          { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 15, windowMs: 60_000 },
        ],
      });
      if (rateLimitResponse) return rateLimitResponse;

      const body = await req.json();
      const mode = typeof body?.mode === "string" ? body.mode : "";

      await dbConnect();
      const service = new PuzzleRushService();
      const payload = await service.startSession(user.walletAddress, mode);

      log.info("puzzleRush.session.started", {
        wallet: maskAddress(user.walletAddress),
        sessionId: payload.sessionId,
        mode: payload.mode,
      });

      return NextResponse.json(payload);
    } catch (error: any) {
      if (error instanceof RushAccessDeniedError) {
        return NextResponse.json(
          { message: error.message, code: error.code },
          { status: 403 }
        );
      }
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("puzzleRush.session.start.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to start Puzzle Rush session" },
        { status: error.status || 500 }
      );
    }
  });
}