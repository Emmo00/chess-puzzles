import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import { withAdminAuth } from "@/lib/admin/middleware";
import PuzzleRushService from "@/lib/services/puzzleRush.service";
import {
  getPuzzleRushConfig,
  mergePuzzleRushConfig,
} from "@/lib/config/puzzleRush";
import { runRequest } from "@/lib/api/withLogging";

export async function GET(request: NextRequest) {
  return runRequest(request, "/api/admin/puzzle-rush-config", async (req, log) => {
    const clientIp = getClientIp(req);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "admin.puzzle-rush-config.read",
      rules: [{ scopeSuffix: "ip", key: clientIp, maxRequests: 60, windowMs: 60_000 }],
    });
    if (rateLimitResponse) return rateLimitResponse;

    const config = await getPuzzleRushConfig();
    return NextResponse.json({ success: true, config });
  });
}

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  return runRequest(request, "/api/admin/puzzle-rush-config", async (req, log) => {
    try {
      const clientIp = getClientIp(req);

      const rateLimitResponse = enforceRateLimitOrResponse({
        endpoint: "admin.puzzle-rush-config.update",
        rules: [{ scopeSuffix: "ip", key: clientIp, maxRequests: 30, windowMs: 60_000 }],
      });
      if (rateLimitResponse) return rateLimitResponse;

      const body = await req.json();
      if (typeof body !== "object" || body === null) {
        return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
      }

      await dbConnect();
      const current = await getPuzzleRushConfig();
      const merged = mergePuzzleRushConfig(current, body);
      const service = new PuzzleRushService();
      const saved = await service.savePuzzleRushConfig(merged);

      log.info("puzzleRush.config.updated", {
        applier: "admin",
        keys: Object.keys(body),
      });

      return NextResponse.json({ success: true, config: saved });
    } catch (error: any) {
      log.error("puzzleRush.config.update.failed", error, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to update Puzzle Rush config" },
        { status: error.status || 500 }
      );
    }
  });
});