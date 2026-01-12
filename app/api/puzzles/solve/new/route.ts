import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { Puzzle } from "@/lib/types";

const MAX_DAILY_FREE_PUZZLES = 5;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    const userService = new UserService();

    // Get today's puzzle count
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);

    // Daily access users get 5 puzzles
    if (count >= MAX_DAILY_FREE_PUZZLES) {
      return NextResponse.json(
        { message: "Daily access limit reached (5 puzzles total)" },
        { status: 429 }
      );
    }

    // Get user settings for filtering puzzles
    const userSettings = await userService.getUserSettings(user.walletAddress);

    // Get puzzle with user's settings applied
    const puzzle: Puzzle & { oldAttempt?: boolean } = await puzzleService.fetchNewSolvePuzzle(userSettings);

    // Store user puzzle attempt in database with appropriate type
    if (!puzzle.oldAttempt) {
      await puzzleService.createUserPuzzle({
        userWalletAddress: user.walletAddress,
        puzzleId: puzzle.puzzleid,
        type: "solve",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Puzzle Fetched",
      userType: "solve",
      puzzleCount: count + 1,
      puzzle: puzzle, // Return the puzzle data
    });
  } catch (error: any) {
    console.error("Error creating daily puzzle attempt:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create puzzle attempt" },
      { status: error.status || 500 }
    );
  }
}
