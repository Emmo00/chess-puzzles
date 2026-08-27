import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleService from "../../lib/services/puzzles.service";
import UserService from "../../lib/services/users.service";
import { calculateEarnedPoints } from "../../lib/scoring";
import AdaptiveService from "../../lib/services/adaptive.service";
import RewardsService from "../../lib/services/rewards.service";
import { authenticateWallet } from "../../middleware/auth";
import { UserPuzzle } from "../../lib/types";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();

    const { puzzleId, mistakes, hintCount = 0, rating, solveTimeSec } = req.body;

    log?.info("puzzle.solve.start", {
      wallet: req.walletAddress,
      puzzleId,
      mistakes,
      hintCount,
      rating,
    });

    if (!puzzleId || typeof mistakes !== "number" || typeof rating !== "number") {
      log?.warn("puzzle.solve.invalidBody", { wallet: req.walletAddress });
      res.status(400).json({ message: "Invalid request body. Required: puzzleId, mistakes, rating" });
      return;
    }

    const puzzleService = new PuzzleService();
    const userService = new UserService();

    const currentUser = await userService.ensureUser(req.walletAddress!);

    const streakUser = await userService.updateUserStreakByUTCDay(req.walletAddress!);
    const breakdown = calculateEarnedPoints({
      kind: "standard",
      hintCount: hintCount || 0,
      streak: streakUser.currentStreak || 1,
      solveTimeSec:
        typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
          ? solveTimeSec
          : Number.MAX_SAFE_INTEGER,
    });
    const points = breakdown.points;
    log?.debug("puzzle.solve.scored", {
      wallet: req.walletAddress,
      puzzleId,
      points,
      streak: streakUser.currentStreak || 1,
    });

    const userPuzzleData: Partial<UserPuzzle> = {
      userWalletAddress: req.walletAddress!,
      puzzleId,
      type: "solve",
      completed: true,
      attempts: mistakes + 1,
      points,
      solvedAt: new Date(),
    };

    const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

    if (updatedUserPuzzle) {
      const refreshedUser = await userService.getUser(req.walletAddress!);
      const oldPoints = refreshedUser.totalPoints || 0;
      const newPoints = oldPoints + (userPuzzleData.points ?? 0);
      const newTotalSolved = (refreshedUser.totalPuzzlesSolved || 0) + 1;

      await userService.updateUserStats(req.walletAddress!, {
        totalPoints: newPoints,
        totalPuzzlesSolved: newTotalSolved,
        lastPuzzleDate: new Date().toISOString(),
      });

      try {
        const adaptiveService = new AdaptiveService();
        await adaptiveService.updateRatingAfterSolve(req.walletAddress!, {
          solveTimeSec:
            typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
              ? solveTimeSec
              : 120,
          hints: hintCount || 0,
          mistakes,
          puzzleRating: rating,
          failed: (hintCount || 0) >= 3,
        });
      } catch (adaptiveError) {
        const err = adaptiveError instanceof Error ? adaptiveError : new Error(String(adaptiveError));
        log?.error("puzzle.solve.adaptiveFailed", err, {
          wallet: req.walletAddress,
          puzzleId,
        });
      }

      try {
        const rewardsService = new RewardsService();
        const levelUp = await rewardsService.processLevelUp(
          req.walletAddress!,
          oldPoints,
          newPoints
        );
        log?.info("puzzle.solve-rewards.processed", {
          wallet: req.walletAddress,
          oldPoints,
          newPoints,
          leveledUp: !!levelUp,
        });
        if (levelUp) {
          res.json({
            message: "Puzzle solved successfully",
            points: userPuzzleData.points,
            breakdown,
            levelUp,
            puzzle: updatedUserPuzzle,
          });
          return;
        }
      } catch (rewardError) {
        const err = rewardError instanceof Error ? rewardError : new Error(String(rewardError));
        log?.error("puzzle.solve.rewardsFailed", err, {
          wallet: req.walletAddress,
          oldPoints,
          newPoints,
        });
      }
    }

    log?.info("puzzle.solve.complete", {
      wallet: req.walletAddress,
      puzzleId,
      points,
    });

    res.json({
      message: "Puzzle solved successfully",
      points: userPuzzleData.points,
      breakdown,
      puzzle: updatedUserPuzzle,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzle.solve.failed", err, { status: error?.status });
    res.status(error.status || 500).json({ message: error.message || "Failed to solve puzzle" });
  }
});

export default router;
