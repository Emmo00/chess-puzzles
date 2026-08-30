import { Router, Request, Response } from "express";
import { getAccessConfig } from "../../lib/config/access";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

// --- Cached contract price ---
let cachedDailyPassPrice: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getDailyPassPriceUsd(): Promise<string> {
  const now = Date.now();
  if (cachedDailyPassPrice && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedDailyPassPrice;
  }

  if (!GAME_ASSETS_CONTRACT) {
    return cachedDailyPassPrice ?? "0.02"; // fallback to default
  }

  try {
    const price = await publicClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "dailyPassPrice",
    });
    // Contract stores price with 6 decimals (USDC/USDT)
    const usd = (Number(price) / 1_000_000).toFixed(2);
    cachedDailyPassPrice = usd;
    cacheTimestamp = now;
    return usd;
  } catch {
    // On RPC failure, return last cached value or default
    return cachedDailyPassPrice ?? "0.02";
  }
}

const router: Router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const [accessConfig, unlockAmountUsd] = await Promise.all([
      getAccessConfig(),
      getDailyPassPriceUsd(),
    ]);

    res.json({
      dailyFreePuzzles: accessConfig.dailyFreePuzzles,
      unlockAmountUsd,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load config" });
  }
});

export default router;
