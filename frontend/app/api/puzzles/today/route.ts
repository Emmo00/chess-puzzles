import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import PuzzleService from "../../../../lib/services/puzzles.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Fetch a new puzzle for today
    const puzzleService = new PuzzleService();
    const puzzle = await puzzleService.fetchNewSolvePuzzle();
    
    return NextResponse.json(puzzle);
  } catch (error: any) {
    console.error("Error fetching daily puzzle:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch daily puzzle" },
      { status: error.status || 500 }
    );
  }
}