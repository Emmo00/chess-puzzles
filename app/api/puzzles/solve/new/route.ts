import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import AdaptiveService from "../../../../../lib/services/adaptive.service";
import { Puzzle } from "@/lib/types";
import { getAccessConfig } from "../../../../../lib/config/access";
import { GAME_ASSETS_CONTRACT } from "../../../../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../../../../lib/abi/gameAssets";

const celoClient = createPublicClient({ chain: celo, transport: http() });

async function hasDailyAccess(walletAddress: string): Promise<boolean> {
  if (!GAME_ASSETS_CONTRACT) return false;
  try {
    return await celoClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "hasActiveDailyPass",
      args: [walletAddress as `0x${string}`],
    });
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    const userService = new UserService();
    const adaptiveService = new AdaptiveService();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "custom" ? "custom" : "adaptive";

    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);
    const unlimited = await hasDailyAccess(user.walletAddress);
    const { dailyFreePuzzles, unlockAmountUsd } = await getAccessConfig();

    if (!unlimited && count >= dailyFreePuzzles) {
      return NextResponse.json(
        { message: `Daily free limit reached (${dailyFreePuzzles} puzzles). Pay $${unlockAmountUsd} USDT for unlimited today.` },
        { status: 429 }
      );
    }

    let puzzle: Puzzle & { oldAttempt?: boolean };

    if (mode === "custom") {
      const userSettings = await userService.getUserSettings(user.walletAddress);
      puzzle = await puzzleService.fetchNewSolvePuzzle(userSettings, {
        userWalletAddress: user.walletAddress,
        puzzleType: "solve",
      });
    } else {
      const effectiveRating = await adaptiveService.getEffectiveRating(user.walletAddress);
      const ratingRange = adaptiveService.getAdaptiveRatingRange(effectiveRating);
      puzzle = await puzzleService.fetchNewSolvePuzzle(
        { ratingRange, disabledThemes: [] },
        {
          userWalletAddress: user.walletAddress,
          puzzleType: "solve",
        }
      );
    }

    if (!puzzle.oldAttempt) {
      await puzzleService.createUserPuzzle({
        userWalletAddress: user.walletAddress,
        puzzleId: puzzle.puzzleid,
        type: "solve",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Puzzle Fetched",
      userType: "solve",
      puzzleCount: count + 1,
      mode,
      puzzle,
    });
  } catch (error: any) {
    console.error("Error creating daily puzzle attempt:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create puzzle attempt" },
      { status: error.status || 500 }
    );
  }
}
