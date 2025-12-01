import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import PuzzleService from "../../../../lib/services/puzzles.service";

const MAX_DAILY_FREE_PUZZLES = 3;

// Cache for today's puzzle (shared across all users)
let dailyPuzzleCache: {
  date: string;
  puzzle: any;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    
    // check if the user has used up their daily free puzzles
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);
    if (count >= MAX_DAILY_FREE_PUZZLES) {
      return NextResponse.json(
        { message: "Daily puzzle limit reached" },
        { status: 429 }
      );
    }

    // Get today's puzzle (same for all users)
    const today = new Date().toDateString();
    let puzzle;
    
    if (dailyPuzzleCache && dailyPuzzleCache.date === today) {
      puzzle = dailyPuzzleCache.puzzle;
    } else {
      puzzle = await puzzleService.fetchPuzzle();
      dailyPuzzleCache = {
        date: today,
        puzzle
      };
    }

    // store user puzzle attempt in database
    await puzzleService.createUserPuzzle({
      userfid: user.walletAddress,
      puzzleId: puzzle.puzzleid,
      type: "free"
    });

    return NextResponse.json({ success: true, message: "Puzzle attempt recorded" });
  } catch (error: any) {
    console.error("Error creating daily puzzle attempt:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create puzzle attempt" },
      { status: error.status || 500 }
    );
  }
}