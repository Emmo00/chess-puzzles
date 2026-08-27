import { Router, Request, Response } from "express";
import { type Hex } from "viem";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import userModel from "../../lib/models/users.model";
import HintsService from "../../lib/services/hints.service";
import { devErrorBody } from "../../lib/utils/devResponse";
import { maskAddress } from "../../middleware/logging";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router = Router();

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
    hasConsumerKey: !!process.env.CONSUMER_PRIVATE_KEY,
    hasGameAssetsContract: !!GAME_ASSETS_CONTRACT,
  });

  let dbHintBalance = 0;
  let contractHintBalance = 0;

  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const lower = walletAddress.toLowerCase();
    log?.info("hint.consume.identity", { wallet: maskAddress(lower) });

    const preUser = await userModel.findOne({ walletAddress: lower });
    dbHintBalance = preUser?.hintBalance ?? 0;

    contractHintBalance = await readContractHintBalance(lower);

    const totalHints = dbHintBalance + contractHintBalance;
    log?.info("hint.consume.balances", {
      wallet: maskAddress(lower),
      dbHintBalance,
      contractHintBalance,
      totalHints,
    });

    if (totalHints <= 0) {
      log?.info("hint.consume.noHints", { wallet: maskAddress(lower), totalHints });
      res.status(400).json({
        success: false,
        message: "Out of hints. Buy more in the store.",
      });
      return;
    }

    const dbUser = await userModel.findOneAndUpdate(
      { walletAddress: lower, hintBalance: { $gt: 0 } },
      { $inc: { hintBalance: -1 } },
      { returnDocument: "after" },
    );

    if (dbUser) {
      const newDbBalance = dbUser.hintBalance ?? 0;
      log?.info("hint.consume.free", {
        wallet: maskAddress(lower),
        dbHintBalance: newDbBalance,
        consumedFrom: "database",
      });
      res.json({
        success: true,
        source: "free",
        totalHints: newDbBalance + contractHintBalance,
      });
      return;
    }

    log?.info("hint.consume.contract.start", {
      wallet: maskAddress(lower),
      contractHintBalance,
    });
    const hintsService = new HintsService();
    const result = await hintsService.consumeHint(lower);
    log?.info("hint.consume.contract.success", {
      wallet: maskAddress(lower),
      txHash: result.txHash,
    });
    res.json({
      ...result,
      source: "contract",
      totalBalance: dbHintBalance + Math.max(0, contractHintBalance - 1),
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("hint.consume.failed", err, {
      wallet: maskAddress(rawWallet || ""),
      dbHintBalance,
      contractHintBalance,
      errorStatus: error?.status,
    });
    res.status(error?.status || 500).json({
      message: error?.message || "Failed to consume hint",
      ...devErrorBody(error),
    });
  }
});

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress as string;
    const lower = walletAddress.toLowerCase();
    const preUser = await userModel.findOne({ walletAddress: lower });
    const db = preUser?.hintBalance ?? 0;
    const contractHintBalance = await readContractHintBalance(lower);
    res.json({
      success: true,
      db,
      contractHintBalance,
      totalHints: db + contractHintBalance,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(error?.status || 500).json({
      message: err.message || "Failed to fetch hint balance",
    });
  }
});

export default router;
