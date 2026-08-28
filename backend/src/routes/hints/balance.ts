import { Router, Request, Response } from "express";
import { type Hex } from "viem";
import { authenticateWallet } from "../../middleware/auth";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";
import { maskAddress } from "../../middleware/logging";

const router: Router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const walletAddress = (req as any).walletAddress as string;
    const lower = walletAddress.toLowerCase();

    let hintBalance = 0;
    let streakFreezes = 0;

    if (GAME_ASSETS_CONTRACT) {
      try {
        const [hints, freezes] = await Promise.all([
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getHintBalance",
            args: [lower as Hex],
          }),
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getStreakFreezeBalance",
            args: [lower as Hex],
          }),
        ]);
        hintBalance = Number(hints);
        streakFreezes = Number(freezes);
      } catch {
        // Contract read failure — return zeros
      }
    }

    log?.info("hints.balance", {
      wallet: maskAddress(lower),
      hintBalance,
      streakFreezes,
    });

    res.json({
      hintBalance,
      streakFreezes,
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
