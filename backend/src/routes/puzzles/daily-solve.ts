import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleService from "../../lib/services/puzzles.service";
import UserService from "../../lib/services/users.service";
import { calculateEarnedPoints } from "../../lib/scoring";
import { authenticateWallet } from "../../middleware/auth";
import { UserPuzzle } from "../../lib/types";

const router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const { puzzleId, mistakes = 0, hintCount = 0, rating = 1200, solveTimeSec } = req.body;

    if (!puzzleId) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const puzzleService = new PuzzleService();
    const userService = new UserService();

    const streakUser = await userService.updateUserStreakByUTCDay(req.walletAddress!);
    const breakdown = calculateEarnedPoints({
      kind: "daily",
      hintCount,
      streak: streakUser.currentStreak || 1,
      solveTimeSec:
        typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
          ? solveTimeSec
          : Number.MAX_SAFE_INTEGER,
    });
    const points = breakdown.points;

    const userPuzzleData: Partial<UserPuzzle> = {
      userWalletAddress: req.walletAddress!,
      puzzleId,
      type: "daily",
      completed: true,
      attempts: mistakes + 1,
      points,
      solvedAt: new Date(),
    };

    const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

    if (updatedUserPuzzle) {
      const currentUser = await userService.getUser(req.walletAddress!);
      const newPoints = (currentUser.totalPoints || 0) + userPuzzleData.points!;
      const newTotalSolved = (currentUser.totalPuzzlesSolved || 0) + 1;

      await userService.updateUserStats(req.walletAddress!, {
        totalPoints: newPoints,
        totalPuzzlesSolved: newTotalSolved,
        lastPuzzleDate: new Date().toISOString(),
      });
    }

    res.json({
      message: "Puzzle solved successfully",
      points: userPuzzleData.points,
      breakdown,
      puzzle: updatedUserPuzzle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to solve puzzle" });
  }
});

export default router;
