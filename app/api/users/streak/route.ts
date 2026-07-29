import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";
import userModel from "../../../../lib/models/users.model";
import { getUtcDayNumber } from "@/lib/utils/time";

export type StreakStatus = "alive" | "at_risk" | "broken";

function computeEffectiveStreak(
  currentStreak: number,
  lastPuzzleDate: string | null | undefined,
  streakFreezes: number
): { effectiveStreak: number; streakStatus: StreakStatus } {
  const today = getUtcDayNumber();

  if (!lastPuzzleDate) {
    return { effectiveStreak: 0, streakStatus: "alive" };
  }

  const lastUtcDay = getUtcDayNumber(new Date(lastPuzzleDate));

  if (lastUtcDay === today || lastUtcDay === today - 1) {
    return { effectiveStreak: currentStreak, streakStatus: "alive" };
  }

  if (lastUtcDay < today - 1 && streakFreezes > 0) {
    return { effectiveStreak: currentStreak, streakStatus: "at_risk" };
  }

  return { effectiveStreak: 1, streakStatus: "broken" };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const userService = new UserService();

    let userData: {
      currentStreak: number;
      longestStreak: number;
      totalPuzzlesSolved: number;
      totalPoints: number;
      lastPuzzleDate: string | null;
      lastLogin: Date;
      streakFreezes: number;
    };
    try {
      const u = await userService.getUser(user.walletAddress);
      userData = {
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        totalPuzzlesSolved: u.totalPuzzlesSolved,
        totalPoints: u.totalPoints,
        lastPuzzleDate: u.lastPuzzleDate,
        lastLogin: u.lastLogin,
        streakFreezes: u.streakFreezes,
      };
    } catch {
      userData = {
        currentStreak: 0,
        longestStreak: 0,
        totalPuzzlesSolved: 0,
        totalPoints: 0,
        lastPuzzleDate: null,
        lastLogin: new Date(),
        streakFreezes: 0,
      };
    }

    const { effectiveStreak, streakStatus } = computeEffectiveStreak(
      userData.currentStreak || 0,
      userData.lastPuzzleDate,
      userData.streakFreezes ?? 0
    );

    return NextResponse.json({
      currentStreak: effectiveStreak,
      longestStreak: userData.longestStreak || 0,
      totalPuzzlesSolved: userData.totalPuzzlesSolved || 0,
      points: userData.totalPoints || 0,
      streakStatus,
      streakFreezes: userData.streakFreezes ?? 0,
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

    const todayUtcDay = getUtcDayNumber();
    const lastPuzzleUtcDay = userData.lastPuzzleDate
      ? getUtcDayNumber(new Date(userData.lastPuzzleDate))
      : null;

    let newStreak = userData.currentStreak;

    if (lastPuzzleUtcDay === null || lastPuzzleUtcDay === todayUtcDay - 1) {
      newStreak = lastPuzzleUtcDay === todayUtcDay - 1 ? userData.currentStreak + 1 : 1;
    } else if (lastPuzzleUtcDay === todayUtcDay) {
      newStreak = userData.currentStreak;
    } else {
      newStreak = 1;
    }

    const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);

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
