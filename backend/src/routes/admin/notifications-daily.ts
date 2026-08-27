import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import { NotificationService } from "../../lib/services/notification.service";
import { getUtcDayNumber } from "../../lib/utils/time";

const router = Router();

router.post("/", requireAdmin, async (_req: Request, res: Response) => {
  await dbConnect();

  const utcDay = getUtcDayNumber(new Date());
  const sent = await NotificationService.sendDailyChallengeNotifications(utcDay);
  res.json({ success: true, sent });
});

export default router;
