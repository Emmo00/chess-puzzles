import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { Puzzle } from "@/lib/types";

import { FREE_DAILY_PUZZLE_LIMIT } from '../../../../../lib/config/premium';
import PremiumService from '../../../../../lib/services/premium.service';


export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    const userService = new UserService();

    // Get today's puzzle count
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);

    // If the user has premium access they get unlimited puzzles
    const premiumService = new PremiumService();
    const hasPremium = await premiumService.hasPremiumAccess(user.walletAddress);

    if (!hasPremium && count >= FREE_DAILY_PUZZLE_LIMIT) {
      return NextResponse.json(
        { message: `Daily access limit reached (${FREE_DAILY_PUZZLE_LIMIT} puzzles). Go Premium to unlock unlimited puzzles.` },
        { status: 402 }
      );
    }

    // Get user settings for filtering puzzles
    const userSettings = await userService.getUserSettings(user.walletAddress);

    // Get puzzle with user's settings applied
    const puzzle: Puzzle & { oldAttempt?: boolean } = await puzzleService.fetchNewSolvePuzzle(
      userSettings,
      {
        userWalletAddress: user.walletAddress,
        puzzleType: "solve",
        reuseIncomplete: false,
      }
    );

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
