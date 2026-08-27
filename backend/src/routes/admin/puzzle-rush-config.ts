import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import PuzzleRushService from "../../lib/services/puzzleRush.service";
import { getPuzzleRushConfig, mergePuzzleRushConfig } from "../../lib/config/puzzleRush";

const router: Router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const config = await getPuzzleRushConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to get Puzzle Rush config" });
  }
});

router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (typeof body !== "object" || body === null) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    await dbConnect();
    const current = await getPuzzleRushConfig();
    const merged = mergePuzzleRushConfig(current, body);
    const service = new PuzzleRushService();
    const saved = await service.savePuzzleRushConfig(merged);

    res.json({ success: true, config: saved });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to update Puzzle Rush config" });
  }
});

export default router;
