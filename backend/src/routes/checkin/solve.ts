import { Router, Request, Response } from "express";

import dbConnect from "../../lib/db";
import CheckInService from "../../lib/services/checkin.service";
import UserService from "../../lib/services/users.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const { puzzleId } = req.body;

    if (!puzzleId || typeof puzzleId !== "string") {
      res.status(400).json({ message: "Invalid request. puzzleId is required." });
      return;
    }

    const checkInService = new CheckInService();
    const userService = new UserService();

    const result = await checkInService.solveDailyChallenge(req.walletAddress!, puzzleId);

    if (result.success && result.firstSolve) {
      const currentUser = await userService.ensureUser(req.walletAddress!);

      await userService.updateUserStreakByUTCDay(req.walletAddress!);

      await userService.updateUserStats(req.walletAddress!, {
        totalPoints: currentUser.totalPoints || 0,
        totalPuzzlesSolved: (currentUser.totalPuzzlesSolved || 0) + 1,
        lastPuzzleDate: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error solving check-in challenge:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to solve check-in challenge",
    });
  }
});

export default router;
