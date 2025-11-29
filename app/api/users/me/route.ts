import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    
    // Get or create user
    const userData = await userService.createUser(user);
    
    // Get full user stats including streak
    const fullUserData = await userService.getUser(user.walletAddress);
    
    return NextResponse.json({
      ...userData,
      currentStreak: fullUserData.current_streak || fullUserData.currentStreak || 0,
      longestStreak: fullUserData.longest_streak || fullUserData.longestStreak || 0,
      totalPuzzlesSolved: fullUserData.puzzles_solved || fullUserData.totalPuzzlesSolved || 0,
      points: fullUserData.total_points || fullUserData.points || 0,
      lastLogin: fullUserData.last_login || fullUserData.lastLoggedIn
    });
  } catch (error: any) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { message: error.message || "Authentication failed" },
      { status: 401 }
    );
  }
}