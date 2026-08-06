import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import UserService from "@/lib/services/users.service";
import { GAME_ASSETS_CONTRACT } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    const userData = await userService.ensureUser(user.walletAddress);

    const freeHints = userData?.hintBalance ?? 0;
    const freeStreakFreezes = userData?.streakFreezes ?? 0;

    let contractHints = 0;
    let contractFreezes = 0;
    if (GAME_ASSETS_CONTRACT) {
      try {
        const [hints, freezes] = await Promise.all([
          celoClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getHintBalance",
            args: [user.walletAddress as `0x${string}`],
          }),
          celoClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getStreakFreezeBalance",
            args: [user.walletAddress as `0x${string}`],
          }),
        ]);
        contractHints = Number(hints);
        contractFreezes = Number(freezes);
      } catch {
        // Contract read failure shouldn't hide DB freebies
      }
    }

    return NextResponse.json({
      walletAddress: userData?.walletAddress || user.walletAddress,
      displayName: userData?.displayName || user.displayName,
      hintBalance: contractHints + freeHints,
      streakFreezes: contractFreezes + freeStreakFreezes,
      contractHints,
      freeHints,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to initialize user" },
      { status: error.status || 500 }
    );
  }
}