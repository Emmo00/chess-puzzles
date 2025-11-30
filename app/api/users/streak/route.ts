import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";
import userModel from "../../../../lib/models/users.model";
import { updateStreak, getPremiumStatus } from "../../../../lib/utils/premium";

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
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        currentStreak: 0,
        current_streak: 0,
        longestStreak: 0,
        longest_streak: 0,
        totalPuzzlesSolved: 0,
        puzzles_solved: 0,
        points: 0,
        total_points: 0,
        lastPuzzleDate: null,
        freePremiumDaysRemaining: 0,
        paidPremiumExpiry: null,
        lastLoggedIn: new Date(),
        last_login: new Date()
      };
    }
    
    const premiumStatus = getPremiumStatus(userData);
    
    return NextResponse.json({
      currentStreak: userData.current_streak || userData.currentStreak || 0,
      longestStreak: userData.longest_streak || userData.longestStreak || 0,
      totalPuzzlesSolved: userData.puzzles_solved || userData.totalPuzzlesSolved || 0,
      points: userData.total_points || userData.points || 0,
      lastLogin: userData.last_login || userData.lastLoggedIn,
      lastPuzzleDate: userData.lastPuzzleDate,
      freePremiumDaysRemaining: userData.freePremiumDaysRemaining || 0,
      paidPremiumExpiry: userData.paidPremiumExpiry,
      premiumStatus
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
    const currentDate = new Date().toISOString();
    const { user: updatedUser, rewardGranted } = updateStreak(userData, currentDate);

    // Save updated user data
    await userModel.findByIdAndUpdate(userData._id, {
      currentStreak: updatedUser.currentStreak,
      current_streak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
      longest_streak: updatedUser.longestStreak,
      lastPuzzleDate: updatedUser.lastPuzzleDate,
      freePremiumDaysRemaining: updatedUser.freePremiumDaysRemaining,
      totalPuzzlesSolved: (userData.totalPuzzlesSolved || 0) + 1,
      puzzles_solved: (userData.puzzles_solved || 0) + 1
    });

    const premiumStatus = getPremiumStatus(updatedUser);

    return NextResponse.json({
      success: true,
      currentStreak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
      premiumStatus,
      rewardGranted
    });

  } catch (error: any) {
    console.error('Error updating streak:', error);
    return NextResponse.json(
      { message: error.message || "Failed to update streak" },
      { status: error.status || 500 }
    );
  }
}