import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import { NotificationService } from "../../lib/services/notification.service";

const router = Router();

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  await dbConnect();

  const inactiveDays = parseInt((req.query.days as string) || "3");
  const sent = await NotificationService.sendReminderNotifications(inactiveDays);
  res.json({ success: true, sent });
});

export default router;
