import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { calculatePoints } from "../../../../../lib/utils/points";
import { UserPuzzle } from "../../../../../lib/types";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const body = await request.json();
    const { puzzleId, attempts } = body;

    if (!puzzleId || typeof attempts !== "number") {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const puzzleService = new PuzzleService();
    const userService = new UserService();

    const userPuzzleData: Partial<UserPuzzle> = {
      userfid: user.walletAddress,
      puzzleId,
      completed: true,
      attempts,
      points: calculatePoints(attempts),
      solvedAt: new Date(),
    };

    const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

    if (updatedUserPuzzle) {
      // Update user stats
      const currentUser = await userService.getUser(user.walletAddress);
      const newPoints = currentUser.points + userPuzzleData.points!;
      const newTotalSolved = currentUser.totalPuzzlesSolved + 1;

      await userService.updateUserStats(user.walletAddress, {
        points: newPoints,
        totalPuzzlesSolved: newTotalSolved,
        lastLoggedIn: new Date(),
        lastPuzzleDate: new Date().toISOString(),
      });

      // Update streak
      await userService.updateUserStreak(user.walletAddress);
    }

    return NextResponse.json({
      message: "Puzzle solved successfully",
      points: userPuzzleData.points,
      puzzle: updatedUserPuzzle,
    });
  } catch (error: any) {
    console.error("Error solving puzzle:", error);
    return NextResponse.json(
      { message: error.message || "Failed to solve puzzle" },
      { status: error.status || 500 }
    );
  }
}
