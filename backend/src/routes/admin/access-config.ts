import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { type AccessConfig, getAccessConfig, saveAccessConfig } from "../../lib/config/access";

const router = Router();

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await getAccessConfig();
    res.json(config);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to get access config" });
  }
});

router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const allowed = ["dailyFreePuzzles", "unlockAmountUsd", "unlockDurationHours", "defaultHints", "defaultStreakFreezes"];
    const current = await getAccessConfig();
    const update: Partial<AccessConfig> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "unlockAmountUsd" && typeof body[key] === "string") {
          (update as any)[key] = body[key];
        } else if (typeof body[key] === "number") {
          (update as any)[key] = body[key];
        }
      }
    }
    if (Object.keys(update).length === 0) {
      res.status(400).json({ message: "No valid fields provided" });
      return;
    }
    const merged: AccessConfig = { ...current, ...update };
    const saved = await saveAccessConfig(merged);
    res.json({ success: true, config: saved });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to update access config" });
  }
});

export default router;
