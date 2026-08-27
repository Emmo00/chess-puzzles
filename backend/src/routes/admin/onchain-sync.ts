import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import { DailyChallenge } from "../../lib/models/dailyChallenge.model";
import { CheckInReservation } from "../../lib/models/checkInReservation.model";

const router = Router();

router.post("/", requireAdmin, async (_req: Request, res: Response) => {
  await dbConnect();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const dailyChallenges = await DailyChallenge.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  });

  const reservations = await CheckInReservation.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  });

  res.json({
    success: true,
    results: {
      dailyChallenges,
      reservations,
      onchainData: { puzzles: 0, reservations: 0 },
      note: "On-chain sync disabled - contract methods not implemented",
    },
  });
});

export default router;
