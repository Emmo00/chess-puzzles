import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import PuzzleRushService from "@/lib/services/puzzleRush.service";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/puzzle-rush/session/result", async (req, log) => {
    try {
      const clientIp = getClientIp(req);
      const user = await authenticateWalletUser(req);

      const rateLimitResponse = enforceRateLimitOrResponse({
        endpoint: "puzzle-rush.session.result",
        rules: [
          { scopeSuffix: "ip", key: clientIp, maxRequests: 240, windowMs: 60_000 },
          { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 120, windowMs: 60_000 },
        ],
      });
      if (rateLimitResponse) return rateLimitResponse;

      const body = await req.json();
      if (
        typeof body?.sessionId !== "string" ||
        typeof body?.stepIndex !== "number" ||
        typeof body?.puzzleId !== "string" ||
        typeof body?.solved !== "boolean"
      ) {
        return NextResponse.json(
          { message: "Invalid request body. Required: sessionId, stepIndex, puzzleId, solved, solveTimeSec" },
          { status: 400 }
        );
      }

      await dbConnect();
      const service = new PuzzleRushService();
      const payload = await service.reportResult(user.walletAddress, body.sessionId, {
        stepIndex: body.stepIndex,
        puzzleId: body.puzzleId,
        solved: body.solved,
        solveTimeSec: body.solveTimeSec,
      });

      log.info("puzzleRush.session.result", {
        wallet: maskAddress(user.walletAddress),
        sessionId: body.sessionId,
        completed: payload.completed,
      });

      return NextResponse.json(payload);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("puzzleRush.session.result.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to record Puzzle Rush result" },
        { status: error.status || 500 }
      );
    }
  });
}