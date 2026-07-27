import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import LeaderboardService from "../../../lib/services/leaderboard.service";
import type { League } from "../../../lib/leagues";

const VALID_LEAGUES = new Set(["king", "knight", "pawn"]);

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
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

    const leaderboardService = new LeaderboardService();
    const result = await leaderboardService.getLeaderboard(
      validPage,
      validLimit,
      walletAddress,
      leagueFilter
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error getting leaderboard:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get leaderboard" },
      { status: error.status || 500 }
    );
  }
}
