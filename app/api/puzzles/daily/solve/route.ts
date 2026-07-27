import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { calculatePoints } from "../../../../../lib/utils/points";
import { calculateEarnedPoints, useNewScoring } from "../../../../../lib/scoring";
import { getScoringConfig } from "../../../../../lib/config/scoring";
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

    const isNewScoring = useNewScoring();
    const scoringConfig = isNewScoring ? await getScoringConfig() : null;

    let points: number;
    let breakdown: any = null;
    if (isNewScoring && scoringConfig) {
      const streakUser = await userService.updateUserStreakByUTCDay(user.walletAddress);
      breakdown = calculateEarnedPoints({
        kind: "daily",
        hintCount,
        streak: streakUser.currentStreak || 1,
        solveTimeSec:
          typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
            ? solveTimeSec
            : Number.MAX_SAFE_INTEGER,
        config: scoringConfig,
      });
      points = breakdown.points;
    } else {
      await userService.updateUserStreakByUTCDay(user.walletAddress);
      points = calculatePoints({ rating, mistakes, hintCount });
    }

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
