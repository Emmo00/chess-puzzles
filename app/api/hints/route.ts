import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { authenticateWalletUser } from "../../../lib/auth";
import { GAME_ASSETS_CONTRACT } from "../../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../../lib/abi/gameAssets";

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateWalletUser(request);
    if (!GAME_ASSETS_CONTRACT) {
      return NextResponse.json({ hintBalance: 0, streakFreezes: 0 });
    }
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
    return NextResponse.json({ hintBalance: Number(hints), streakFreezes: Number(freezes) });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch hint balance" },
      { status: error.status || 500 }
    );
  }
}