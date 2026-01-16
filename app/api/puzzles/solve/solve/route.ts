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
    
    // Authenticate user
    const user = await authenticateWalletUser(request);
    const body = await request.json();
    // Extract puzzleId, mistakes, hintCount, and rating from request body
    const { puzzleId, mistakes, hintCount = 0, rating } = body;

    if (!puzzleId || typeof mistakes !== "number" || typeof rating !== "number") {
      return NextResponse.json(
        { message: "Invalid request body. Required: puzzleId, mistakes, rating" },
        { status: 400 }
      );
    }

    const puzzleService = new PuzzleService();
    const userService = new UserService();

    const points = calculatePoints({ rating, mistakes, hintCount: hintCount || 0 });

    const userPuzzleData: Partial<UserPuzzle> = {
      userWalletAddress: user.walletAddress,
      puzzleId,
      type: "solve",
      completed: true,
      attempts: mistakes + 1, // Keep track of total attempts (mistakes + successful attempt)
      points,
      solvedAt: new Date(),
    };

    const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

    if (updatedUserPuzzle) {
      // Get or create user
      let currentUser;
      try {
        currentUser = await userService.getUser(user.walletAddress);
      } catch (error: any) {
        // User doesn't exist, create them
        if (error.status === 404) {
          await userService.createUser({
            walletAddress: user.walletAddress,
            displayName: user.displayName || user.walletAddress.slice(0, 8),
          });
          // Fetch the newly created user to get full stats
          currentUser = await userService.getUser(user.walletAddress);
        } else {
          throw error;
        }
      }

      // Update streak first (this also updates lastLogin)
      await userService.updateUserStreak(user.walletAddress);

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