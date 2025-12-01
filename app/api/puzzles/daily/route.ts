import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import PuzzleService from "../../../../lib/services/puzzles.service";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";

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

    // Check if user has premium access
    const hasPremium = activePayments.some(payment => 
      payment.paymentType === PaymentType.PREMIUM
    );

    // Check if user has daily access
    const hasDailyAccess = activePayments.some(payment => 
      payment.paymentType === PaymentType.DAILY_ACCESS
    );

    // Get today's puzzle count
    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);
    
    // Determine access limits based on payment status
    if (hasPremium) {
      // Premium users get unlimited puzzles
      console.log(`Premium user ${user.walletAddress} accessing puzzle ${count + 1}`);
    } else if (hasDailyAccess) {
      // Daily access users get 3 additional puzzles on top of free ones
      if (count >= (MAX_DAILY_FREE_PUZZLES + 3)) {
        return NextResponse.json(
          { message: "Daily access limit reached (6 puzzles total)" },
          { status: 429 }
        );
      }
      console.log(`Daily access user ${user.walletAddress} accessing puzzle ${count + 1}/6`);
    } else {
      // Free users get only 3 puzzles
      if (count >= MAX_DAILY_FREE_PUZZLES) {
        return NextResponse.json(
          { message: "Daily free puzzle limit reached" },
          { status: 429 }
        );
      }
      console.log(`Free user ${user.walletAddress} accessing puzzle ${count + 1}/3`);
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

    // Store user puzzle attempt in database with appropriate type
    const puzzleType = hasPremium ? "premium" : hasDailyAccess ? "daily" : "free";
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