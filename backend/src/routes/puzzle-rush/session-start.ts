import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleRushService, {
  RushAccessDeniedError,
} from "../../lib/services/puzzleRush.service";
import { authenticateWallet } from "../../middleware/auth";

const router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const body = req.body;
    const mode = typeof body?.mode === "string" ? body.mode : "";

    await dbConnect();
    const service = new PuzzleRushService();
    const payload = await service.startSession(req.walletAddress!, mode);

    log?.info("puzzleRush.session.started", {
      wallet: req.walletAddress,
      sessionId: payload.sessionId,
      mode: payload.mode,
    });

    res.json(payload);
  } catch (error: any) {
    if (error instanceof RushAccessDeniedError) {
      res.status(403).json({ message: error.message, code: error.code });
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzleRush.session.start.failed", err, { status: error?.status });
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to start Puzzle Rush session" });
  }
});

export default router;
