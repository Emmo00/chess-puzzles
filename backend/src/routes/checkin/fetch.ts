import { Router, Request, Response } from "express";

import { dbConnect } from "@workspace/db";
import CheckInService from "../../lib/services/checkin.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const checkInService = new CheckInService();

    const result = await checkInService.fetchDailyChallenge(
      req.walletAddress!
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error reserving check-in challenge:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to reserve daily challenge",
    });
  }
});

export default router;
