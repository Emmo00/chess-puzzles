import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleService from "../../lib/services/puzzles.service";
import { authenticateWallet } from "../../middleware/auth";
import { getAccessConfig } from "../../lib/config/access";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const puzzleService = new PuzzleService();

    const hasDailyAccess = GAME_ASSETS_CONTRACT
      ? await publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "hasActiveDailyPass",
          args: [req.walletAddress as `0x${string}`],
        })
      : false;

    const count = await puzzleService.getNumberOfPuzzlesGivenToday(req.walletAddress!);

    const { dailyFreePuzzles } = await getAccessConfig();
    if (hasDailyAccess) {
      if (count >= dailyFreePuzzles) {
        res.status(429).json({
          message: `Daily access limit reached (${dailyFreePuzzles} puzzles total)`,
        });
        return;
      }
      console.log(`Daily access user ${req.walletAddress} accessing puzzle ${count + 1}/${dailyFreePuzzles}`);
    } else {
      res.status(403).json({
        message: "Payment required. Purchase daily access to solve puzzles.",
      });
      return;
    }

    const puzzle = await puzzleService.fetchNewSolvePuzzle();

    const puzzleType = "daily";
    await puzzleService.createUserPuzzle({
      userWalletAddress: req.walletAddress!,
      puzzleId: puzzle.puzzleid,
      type: puzzleType,
    });

    res.json({
      success: true,
      message: "Puzzle attempt recorded",
      userType: puzzleType,
      puzzleCount: count + 1,
      puzzle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to create puzzle attempt" });
  }
});

export default router;
