import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";
import userModel from "../../../../lib/models/users.model";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";
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
        paidPremiumExpiry: null,
        lastLoggedIn: new Date(),
        last_login: new Date()
      };
    }
    
    // Check for paid premium subscription
    const now = new Date();
    const paidPremium = await Payment.findOne({
      walletAddress: user.walletAddress.toLowerCase(),
      paymentType: PaymentType.PREMIUM,
      verified: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });
    
    const streakPremiumStatus = getPremiumStatus(userData);
    const hasPaidPremium = !!paidPremium;
    const paidExpiryDate = paidPremium?.expiresAt?.toISOString() || null;
    
    // Combine paid premium with streak-based premium status
    const combinedPremiumStatus = {
      isActive: streakPremiumStatus.isActive || hasPaidPremium,
      paidExpiryDate: paidExpiryDate,
      nextRewardAt: streakPremiumStatus.nextRewardAt
    };
    
    return NextResponse.json({
      currentStreak: userData.current_streak || userData.currentStreak || 0,
      longestStreak: userData.longest_streak || userData.longestStreak || 0,
      totalPuzzlesSolved: userData.puzzles_solved || userData.totalPuzzlesSolved || 0,
      points: userData.total_points || userData.points || 0,
      lastLogin: userData.last_login || userData.lastLoggedIn,
      lastPuzzleDate: userData.lastPuzzleDate,
      paidPremiumExpiry: paidExpiryDate,
      premiumStatus: combinedPremiumStatus
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
      totalPuzzlesSolved: (userData.totalPuzzlesSolved || 0) + 1,
      puzzles_solved: (userData.puzzles_solved || 0) + 1
    });

    // Check for paid premium subscription for updated response
    const now = new Date();
    const paidPremium = await Payment.findOne({
      walletAddress: user.walletAddress.toLowerCase(),
      paymentType: PaymentType.PREMIUM,
      verified: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });
    
    const streakPremiumStatus = getPremiumStatus(updatedUser);
    const hasPaidPremium = !!paidPremium;
    const paidExpiryDate = paidPremium?.expiresAt?.toISOString() || null;
    
    const combinedPremiumStatus = {
      isActive: streakPremiumStatus.isActive || hasPaidPremium,
      paidExpiryDate: paidExpiryDate,
      nextRewardAt: streakPremiumStatus.nextRewardAt
    };

    return NextResponse.json({
      success: true,
      currentStreak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
      premiumStatus: combinedPremiumStatus,
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