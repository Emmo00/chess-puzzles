import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateUser } from "../../../../lib/auth";
import LeaderboardService from "../../../../lib/services/leaderboard.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const filter = searchParams.get('filter') || 'global';

    const leaderboardService = new LeaderboardService();
    
    const result = await leaderboardService.getLeaderboard({
      category: "totalPuzzlesSolved",
      filter,
      userFid: user.fid,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error getting solved leaderboard:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get leaderboard" },
      { status: error.status || 500 }
    );
  }
}