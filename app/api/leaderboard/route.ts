import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import LeaderboardService from "../../../lib/services/leaderboard.service";
import type { League } from "../../../lib/leagues";
import { runRequest } from "@/lib/api/withLogging";

const VALID_LEAGUES = new Set(["king", "knight", "pawn"]);

export async function GET(request: NextRequest) {
  return runRequest(request, "/api/leaderboard", async (req, log) => {
    try {
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const walletAddress = searchParams.get("walletAddress") || undefined;
      const leagueParam = searchParams.get("league") || undefined;
      const leagueFilter = leagueParam && VALID_LEAGUES.has(leagueParam)
        ? (leagueParam as League)
        : null;

      // Validate pagination params
      const validPage = Math.max(1, page);
      const validLimit = Math.min(100, Math.max(1, limit));

      log.debug("leaderboard.fetch", {
        page: validPage,
        limit: validLimit,
        hasWallet: !!walletAddress,
        league: leagueFilter,
      });

      const leaderboardService = new LeaderboardService();
      const result = await leaderboardService.getLeaderboard(
        validPage,
        validLimit,
        walletAddress,
        leagueFilter
      );

      return NextResponse.json(result);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("leaderboard.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to get leaderboard" },
        { status: error.status || 500 }
      );
    }
  });
}