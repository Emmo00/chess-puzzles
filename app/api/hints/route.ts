import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "../../../lib/auth";
import { GAME_ASSETS_CONTRACT } from "../../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../../lib/abi/gameAssets";
import userModel from "../../../lib/models/users.model";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function GET(request: NextRequest) {
  return runRequest(request, "/api/hints", async (req, log) => {
    try {
      await dbConnect();
      const user = await authenticateWalletUser(req);
      const lower = user.walletAddress.toLowerCase();

      const userData = await userModel.findOne(
        { walletAddress: lower },
        { hintBalance: 1, streakFreezes: 1 }
      ).lean();
      const freeHints = (userData?.hintBalance ?? 0);
      const freeStreakFreezes = (userData?.streakFreezes ?? 0);

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

      log.info("hints.balance", {
        wallet: maskAddress(lower),
        freeHints,
        contractHints,
        total: contractHints + freeHints,
      });

      return NextResponse.json({
        hintBalance: contractHints + freeHints,
        streakFreezes: contractFreezes + freeStreakFreezes,
        contractHints,
        freeHints,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("hints.balance.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to fetch hint balance" },
        { status: error.status || 500 }
      );
    }
  });
}