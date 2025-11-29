import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    
    // Get user data including current streak
    const userData = await userService.getUser(user.walletAddress);
    
    return NextResponse.json({
      currentStreak: userData.current_streak || userData.currentStreak || 0,
      longestStreak: userData.longest_streak || userData.longestStreak || 0,
      totalPuzzlesSolved: userData.puzzles_solved || userData.totalPuzzlesSolved || 0,
      points: userData.total_points || userData.points || 0,
      lastLogin: userData.last_login || userData.lastLoggedIn
    });
  } catch (error: any) {
    console.error("Error fetching user streak:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch user streak" },
      { status: error.status || 500 }
    );
  }
}