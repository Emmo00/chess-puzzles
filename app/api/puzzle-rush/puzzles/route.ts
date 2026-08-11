import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import puzzleIssueService from "@/lib/services/puzzleIssue.service";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/puzzle-rush/puzzles", async (req, log) => {
    try {
      const clientIp = getClientIp(req);
      const user = await authenticateWalletUser(req);

      const rateLimitResponse = enforceRateLimitOrResponse({
        endpoint: "puzzle-rush.puzzles",
        rules: [
          { scopeSuffix: "ip", key: clientIp, maxRequests: 120, windowMs: 60_000 },
          { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 90, windowMs: 60_000 },
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
      const moves = typeof body?.moves === "number" ? body.moves : 2;
      const count = typeof body?.count === "number" ? body.count : 12;

      await dbConnect();
      const puzzles = await puzzleIssueService.issueBatch(
        user.walletAddress,
        body.sessionId,
        moves,
        count
      );

      log.info("puzzleRush.puzzles.issued", {
        wallet: maskAddress(user.walletAddress),
        sessionId: body.sessionId,
        moves,
        count: puzzles.length,
      });

      return NextResponse.json({ puzzles });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("puzzleRush.puzzles.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to fetch puzzles" },
        { status: error.status || 500 }
      );
    }
  });
}
