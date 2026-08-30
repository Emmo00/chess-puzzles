import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import PuzzleService from "../../lib/services/puzzles.service";
import UserService from "../../lib/services/users.service";
import AdaptiveService from "../../lib/services/adaptive.service";
import { authenticateWallet } from "../../middleware/auth";
import { getAccessConfig } from "../../lib/config/access";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";
import { Puzzle } from "@workspace/db";

const router: Router = Router();

async function hasDailyAccess(walletAddress: string): Promise<boolean> {
  if (!GAME_ASSETS_CONTRACT) return false;
  try {
    return await publicClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "hasActiveDailyPass",
      args: [walletAddress as `0x${string}`],
    });
  } catch {
    return false;
  }
}

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();

    const puzzleService = new PuzzleService();
    const userService = new UserService();
    const adaptiveService = new AdaptiveService();

    const mode = req.query.mode === "custom" ? "custom" : "adaptive";

    const count = await puzzleService.getNumberOfPuzzlesGivenToday(req.walletAddress!);
    const unlimited = await hasDailyAccess(req.walletAddress!);
    const { dailyFreePuzzles, unlockAmountUsd } = await getAccessConfig();

    log?.debug("puzzle.new.checkAccess", {
      wallet: req.walletAddress,
      mode,
      count,
      unlimited,
      dailyFreePuzzles,
    });

    if (!unlimited && count >= dailyFreePuzzles) {
      log?.warn("puzzle.new.limitReached", {
        wallet: req.walletAddress,
        count,
        dailyFreePuzzles,
      });
      res.status(429).json({
        message: `Daily free limit reached (${dailyFreePuzzles} puzzles). Pay $${unlockAmountUsd} USDT for unlimited today.`,
      });
      return;
    }

    let puzzle: Puzzle & { oldAttempt?: boolean };

    if (mode === "custom") {
      const userSettings = await userService.getUserSettings(req.walletAddress!);
      puzzle = await puzzleService.fetchNewSolvePuzzle(userSettings, {
        userWalletAddress: req.walletAddress!,
        puzzleType: "solve",
      });
    } else {
      const effectiveRating = await adaptiveService.getEffectiveRating(req.walletAddress!);
      const ratingRange = adaptiveService.getAdaptiveRatingRange(effectiveRating);
      puzzle = await puzzleService.fetchNewSolvePuzzle(
        { ratingRange, disabledThemes: [] },
        {
          userWalletAddress: req.walletAddress!,
          puzzleType: "solve",
        }
      );
    }

    if (!puzzle.oldAttempt) {
      await puzzleService.createUserPuzzle({
        userWalletAddress: req.walletAddress!,
        puzzleId: puzzle.puzzleid,
        type: "solve",
      });
    }

    log?.info("puzzle.new.created", {
      wallet: req.walletAddress,
      mode,
      puzzleId: puzzle.puzzleid,
      puzzleCount: count + 1,
    });

    res.json({
      success: true,
      message: "Puzzle Fetched",
      userType: "solve",
      puzzleCount: count + 1,
      mode,
      puzzle,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzle.new.failed", err, { status: error?.status });
    res.status(error.status || 500).json({ message: error.message || "Failed to create puzzle attempt" });
  }
});

export default router;
