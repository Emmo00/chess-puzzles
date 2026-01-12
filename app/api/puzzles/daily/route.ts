import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import PuzzleService from "../../../../lib/services/puzzles.service";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";

const MAX_DAILY_PUZZLES = 3;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    
    // Check user's payment status
    const now = new Date();
    const activePayments = await Payment.find({
      walletAddress: user.walletAddress.toLowerCase(),
      verified: true,
      $or: [
        { expiresAt: { $gt: now } }, // Not expired
        { expiresAt: null } // No expiry (shouldn't happen but just in case)
      ]
    }).sort({ createdAt: -1 });

    // Check if user has daily access
    const hasDailyAccess = activePayments.some(payment => 
      payment.paymentType === PaymentType.DAILY_ACCESS
    );

    // Get today's puzzle count
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);
    
    // Determine access limits based on payment status
    if (hasDailyAccess) {
      // Daily access users get 3 puzzles
      if (count >= MAX_DAILY_PUZZLES) {
        return NextResponse.json(
          { message: "Daily access limit reached (3 puzzles total)" },
          { status: 429 }
        );
      }
      console.log(`Daily access user ${user.walletAddress} accessing puzzle ${count + 1}/3`);
    } else {
      // Free users get no access
      return NextResponse.json(
        { message: "Payment required. Purchase daily access to solve puzzles." },
        { status: 403 }
      );
    }

    // Get today's puzzle
    const puzzle = await puzzleService.fetchNewSolvePuzzle();

    // Store user puzzle attempt in database with appropriate type
    const puzzleType = "daily";
    await puzzleService.createUserPuzzle({
      userfid: user.walletAddress,
      puzzleId: puzzle.puzzleid,
      type: puzzleType
    });

    return NextResponse.json({ 
      success: true, 
      message: "Puzzle attempt recorded",
      userType: puzzleType,
      puzzleCount: count + 1,
      puzzle: puzzle // Return the puzzle data
    });
  } catch (error: any) {
    console.error("Error creating daily puzzle attempt:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create puzzle attempt" },
      { status: error.status || 500 }
    );
  }
}