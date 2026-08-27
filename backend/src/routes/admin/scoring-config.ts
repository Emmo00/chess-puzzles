import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { type ScoringConfig, getScoringConfig, saveScoringConfig } from "../../lib/config/scoring";

const router = Router();

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await getScoringConfig();
    res.json(config);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to get scoring config" });
  }
});

router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const allowed = [
      "basePointsStandard",
      "basePointsDaily",
      "hintPenalty1",
      "hintPenalty2",
      "hintFailThreshold",
      "streakCap",
      "streakStep",
      "streakCapAt",
      "speedBonus",
      "speedBonusThresholdSec",
    ];

    const current = await getScoringConfig();
    const update: Partial<ScoringConfig> = {};
    for (const key of allowed) {
      if (body[key] !== undefined && typeof body[key] === "number") {
        (update as any)[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ message: "No valid fields provided" });
      return;
    }

    const merged: ScoringConfig = { ...current, ...update };
    const saved = await saveScoringConfig(merged);

    res.json({ success: true, config: saved });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to update scoring config" });
  }
});

export default router;
