import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import PuzzleService from "../../../../lib/services/puzzles.service";

const MAX_DAILY_FREE_PUZZLES = 3;

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

    const puzzle = await puzzleService.fetchPuzzle();

    // store in database
    await puzzleService.createUserPuzzle({
      userfid: user.walletAddress,
      puzzleId: puzzle.puzzleid,
      type: "free"
    });

    return NextResponse.json(puzzle);
  } catch (error: any) {
    console.error("Error fetching daily puzzle:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch puzzle" },
      { status: error.status || 500 }
    );
  }
}