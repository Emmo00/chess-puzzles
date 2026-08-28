import { Router, Request, Response } from "express";
import { type Hex } from "viem";
import { authenticateWallet } from "../../middleware/auth";
import HintsService from "../../lib/services/hints.service";
import { devErrorBody } from "../../lib/utils/devResponse";
import { maskAddress } from "../../middleware/logging";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router: Router = Router();

async function readContractHintBalance(walletAddress: string): Promise<number> {
  if (!GAME_ASSETS_CONTRACT) return 0;
  try {
    const value = await publicClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "getHintBalance",
      args: [walletAddress as Hex],
    });
    return Number(value);
  } catch {
    return 0;
  }
}

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  const rawWallet =
    (req.headers["x-wallet-address"] as string) ||
    req.headers.authorization?.replace("Bearer ", "") ||
    (req.query.walletAddress as string) ||
    undefined;

  log?.info("hint.consume.request", { wallet: maskAddress(rawWallet || "") });

  log?.debug("hint.consume.serverConfig", {
    hasAssetConsumptionKey: !!process.env.ASSET_CONSUMPTION_KEY,
    hasGameAssetsContract: !!GAME_ASSETS_CONTRACT,
  });

  try {
    const walletAddress = (req as any).walletAddress as string;
    const lower = walletAddress.toLowerCase();
    log?.info("hint.consume.identity", { wallet: maskAddress(lower) });

    const contractHintBalance = await readContractHintBalance(lower);
    log?.info("hint.consume.balance", {
      wallet: maskAddress(lower),
      contractHintBalance,
    });

    if (contractHintBalance <= 0) {
      log?.info("hint.consume.noHints", { wallet: maskAddress(lower) });
      res.status(400).json({
        success: false,
        message: "Out of hints. Buy more in the store.",
      });
      return;
    }

    log?.info("hint.consume.contract.start", { wallet: maskAddress(lower) });
    const hintsService = new HintsService();
    const result = await hintsService.consumeHint(lower);
    log?.info("hint.consume.contract.success", {
      wallet: maskAddress(lower),
      txHash: result.txHash,
    });
    res.json({
      ...result,
      source: "contract",
      totalBalance: contractHintBalance - 1,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("hint.consume.failed", err, {
      wallet: maskAddress(rawWallet || ""),
      errorStatus: error?.status,
    });
    res.status(error?.status || 500).json({
      message: error?.message || "Failed to consume hint",
      ...devErrorBody(error),
    });
  }
});

export default router;
