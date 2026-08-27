import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleRushService from "../../lib/services/puzzleRush.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const body = req.body;
    if (
      typeof body?.sessionId !== "string" ||
      typeof body?.stepIndex !== "number" ||
      typeof body?.puzzleId !== "string" ||
      typeof body?.solved !== "boolean"
    ) {
      res.status(400).json({
        message:
          "Invalid request body. Required: sessionId, stepIndex, puzzleId, solved, solveTimeSec",
      });
      return;
    }

    await dbConnect();
    const service = new PuzzleRushService();
    const payload = await service.reportResult(req.walletAddress!, body.sessionId, {
      stepIndex: body.stepIndex,
      puzzleId: body.puzzleId,
      solved: body.solved,
      solveTimeSec: body.solveTimeSec,
    });

    log?.info("puzzleRush.session.result", {
      wallet: req.walletAddress,
      sessionId: body.sessionId,
      completed: payload.completed,
    });

    res.json(payload);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzleRush.session.result.failed", err, { status: error?.status });
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to record Puzzle Rush result" });
  }
});

export default router;
