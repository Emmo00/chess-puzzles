import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import PuzzleService from "../../../../lib/services/puzzles.service";
import { getAccessConfig } from "../../../../lib/config/access";
import { GAME_ASSETS_CONTRACT } from "../../../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../../../lib/abi/gameAssets";

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const puzzleService = new PuzzleService();
    
    const hasDailyAccess = GAME_ASSETS_CONTRACT
      ? await celoClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "hasActiveDailyPass",
          args: [user.walletAddress as `0x${string}`],
        })
      : false;

    const count = await puzzleService.getNumberOfPuzzlesGivenToday(user.walletAddress);
    
    const { dailyFreePuzzles } = await getAccessConfig();
    if (hasDailyAccess) {
      if (count >= dailyFreePuzzles) {
        return NextResponse.json(
          { message: `Daily access limit reached (${dailyFreePuzzles} puzzles total)` },
          { status: 429 }
        );
      }
      console.log(`Daily access user ${user.walletAddress} accessing puzzle ${count + 1}/${dailyFreePuzzles}`);
    } else {
      return NextResponse.json(
        { message: "Payment required. Purchase daily access to solve puzzles." },
        { status: 403 }
      );
    }

    const puzzle = await puzzleService.fetchNewSolvePuzzle();

    const puzzleType = "daily";
    await puzzleService.createUserPuzzle({
      userWalletAddress: user.walletAddress,
      puzzleId: puzzle.puzzleid,
      type: puzzleType
    });

    return NextResponse.json({ 
      success: true, 
      message: "Puzzle attempt recorded",
      userType: puzzleType,
      puzzleCount: count + 1,
      puzzle: puzzle
    });
  } catch (error: any) {
    console.error("Error creating daily puzzle attempt:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create puzzle attempt" },
      { status: error.status || 500 }
    );
  }
}