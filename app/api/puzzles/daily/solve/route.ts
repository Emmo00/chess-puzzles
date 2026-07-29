import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { calculateEarnedPoints } from "../../../../../lib/scoring";
import { UserPuzzle } from "../../../../../lib/types";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const body = await request.json();
    const { puzzleId, mistakes = 0, hintCount = 0, rating = 1200, solveTimeSec } = body;

    if (!puzzleId) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const puzzleService = new PuzzleService();
    const userService = new UserService();

    const streakUser = await userService.updateUserStreakByUTCDay(user.walletAddress);
    const breakdown = calculateEarnedPoints({
      kind: "daily",
      hintCount,
      streak: streakUser.currentStreak || 1,
      solveTimeSec:
        typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
          ? solveTimeSec
          : Number.MAX_SAFE_INTEGER,
    });
    const points = breakdown.points;

    const userPuzzleData: Partial<UserPuzzle> = {
      userWalletAddress: user.walletAddress,
      puzzleId,
      type: "daily",
      completed: true,
      attempts: mistakes + 1,
      points,
      solvedAt: new Date(),
    };

    const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

    if (updatedUserPuzzle) {
      const currentUser = await userService.getUser(user.walletAddress);
      const newPoints = (currentUser.totalPoints || 0) + userPuzzleData.points!;
      const newTotalSolved = (currentUser.totalPuzzlesSolved || 0) + 1;

      await userService.updateUserStats(user.walletAddress, {
        totalPoints: newPoints,
        totalPuzzlesSolved: newTotalSolved,
        lastPuzzleDate: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      message: "Puzzle solved successfully",
      points: userPuzzleData.points,
      breakdown,
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
