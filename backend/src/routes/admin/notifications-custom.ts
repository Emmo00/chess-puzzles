import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import { NotificationService } from "../../lib/services/notification.service";

const router = Router();

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  await dbConnect();

  const body = req.body;
  const { title, description, destinationUrl } = body;

  if (!title || !description) {
    res.status(400).json({ error: "title and description are required" });
    return;
  }

  const sent = await NotificationService.sendCustomNotification({ title, description, destinationUrl });
  res.json({ success: true, sent });
});

export default router;
