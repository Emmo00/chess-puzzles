import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    const puzzleService = new PuzzleService();
    
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.fid);
    
    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Error getting puzzle count:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get puzzle count" },
      { status: error.status || 500 }
    );
  }
}