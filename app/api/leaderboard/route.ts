// TODO: return leaderboard data based on streak * points
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import { authenticateWalletUser } from "../../../lib/auth";
import LeaderboardService from "../../../lib/services/leaderboard.service";

export async function GET(request: NextRequest) {
  try {
  } catch (error: any) {
    console.error("Error getting solved leaderboard:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get leaderboard" },
      { status: error.status || 500 }
    );
  }
}
