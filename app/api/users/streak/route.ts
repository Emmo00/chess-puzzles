import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";
import userModel from "../../../../lib/models/users.model";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    
    // Get user data including current streak
    let userData;
    try {
      userData = await userService.getUser(user.walletAddress);
    } catch (userError) {
      // If user doesn't exist, create with default values
      userData = {
        currentStreak: 0,
        longestStreak: 0,
        totalPuzzlesSolved: 0,
        totalPoints: 0,
        lastPuzzleDate: null,
        lastLogin: new Date(),
      };
    }
    
    return NextResponse.json({
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      totalPuzzlesSolved: userData.totalPuzzlesSolved || 0,
      points: userData.totalPoints || 0,
      lastLogin: userData.lastLogin,
      lastPuzzleDate: userData.lastPuzzleDate,
    });
  } catch (error: any) {
    console.error("Error fetching user streak:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch user streak" },
      { status: error.message === "Wallet address not provided" ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    
    const userData = await userModel.findOne({ walletAddress: user.walletAddress.toLowerCase() });
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update streak when user solves a puzzle
    const today = new Date().toDateString();
    const lastPuzzleDate = userData.lastPuzzleDate ? new Date(userData.lastPuzzleDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = userData.currentStreak;
    
    if (!lastPuzzleDate || lastPuzzleDate === yesterday) {
      // Continue or start streak
      newStreak = lastPuzzleDate === yesterday ? userData.currentStreak + 1 : 1;
    } else if (lastPuzzleDate === today) {
      // Already played today, no change
      newStreak = userData.currentStreak;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);

    // Save updated user data
    await userModel.findByIdAndUpdate(userData._id, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastPuzzleDate: new Date().toISOString(),
      totalPuzzlesSolved: (userData.totalPuzzlesSolved || 0) + 1,
    });

    return NextResponse.json({
      success: true,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
    });

  } catch (error: any) {
    console.error('Error updating streak:', error);
    return NextResponse.json(
      { message: error.message || "Failed to update streak" },
      { status: error.status || 500 }
    );
  }
}