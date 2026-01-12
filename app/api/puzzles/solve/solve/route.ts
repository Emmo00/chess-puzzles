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
    // Extract puzzleId and attempts from request body
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
      userWalletAddress: user.walletAddress,
      puzzleId,
      type: "solve",
      completed: true,
      attempts,
      points: calculatePoints(attempts),
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

      const newPoints = (currentUser.totalPoints || 0) + userPuzzleData.points!;
      const newTotalSolved = (currentUser.totalPuzzlesSolved || 0) + 1;

      await userService.updateUserStats(user.walletAddress, {
        totalPoints: newPoints,
        totalPuzzlesSolved: newTotalSolved,
        lastLogin: new Date(),
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