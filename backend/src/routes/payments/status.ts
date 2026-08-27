import { Router, Request, Response } from "express";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { maskAddress } from "../../middleware/logging";
import { publicClient } from "../../config/publicClient";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const walletAddress = req.query.walletAddress as string;

    if (!walletAddress) {
      log?.warn("payments.status.missingWallet");
      res.status(400).json({ error: "Wallet address required" });
      return;
    }

    const hasDailyAccess = GAME_ASSETS_CONTRACT
      ? await publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "hasActiveDailyPass",
          args: [walletAddress as `0x${string}`],
        })
      : false;

    log?.info("payments.status", {
      wallet: maskAddress(walletAddress),
      hasDailyAccess: !!hasDailyAccess,
    });

    res.json({
      hasAccess: hasDailyAccess,
      hasDailyAccess,
      message: hasDailyAccess
        ? "Daily access active"
        : "No active access found",
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("payments.status.failed", err);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

export default router;
