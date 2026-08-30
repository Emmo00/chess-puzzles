import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import PuzzleRushService from "../../lib/services/puzzleRush.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const body = req.body;
    if (typeof body?.sessionId !== "string") {
      res.status(400).json({ message: "Invalid request body. Required: sessionId" });
      return;
    }

    await dbConnect();
    const service = new PuzzleRushService();
    const payload = await service.endSession(req.walletAddress!, body.sessionId);

    log?.info("puzzleRush.session.ended", {
      wallet: req.walletAddress,
      sessionId: body.sessionId,
    });

    res.json(payload);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzleRush.session.end.failed", err, { status: error?.status });
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to end Puzzle Rush session" });
  }
});

export default router;
