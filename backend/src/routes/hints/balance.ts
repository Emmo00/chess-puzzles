import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import userModel from "../../lib/models/users.model";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";
import { maskAddress } from "../../middleware/logging";

const router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const lower = walletAddress.toLowerCase();

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
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getHintBalance",
            args: [walletAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getStreakFreezeBalance",
            args: [walletAddress as `0x${string}`],
          }),
        ]);
        contractHints = Number(hints);
        contractFreezes = Number(freezes);
      } catch {
        // Contract read failure shouldn't hide DB freebies
      }
    }

    log?.info("hints.balance", {
      wallet: maskAddress(lower),
      freeHints,
      contractHints,
      total: contractHints + freeHints,
    });

    res.json({
      hintBalance: contractHints + freeHints,
      streakFreezes: contractFreezes + freeStreakFreezes,
      contractHints,
      freeHints,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("hints.balance.failed", err, { status: error?.status });
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch hint balance",
    });
  }
});

export default router;
