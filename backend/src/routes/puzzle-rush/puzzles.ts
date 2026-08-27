import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import puzzleIssueService from "../../lib/services/puzzleIssue.service";
import { authenticateWallet } from "../../middleware/auth";

const router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const body = req.body;
    if (typeof body?.sessionId !== "string") {
      res.status(400).json({ message: "Invalid request body. Required: sessionId" });
      return;
    }
    const moves = typeof body?.moves === "number" ? body.moves : 2;
    const count = typeof body?.count === "number" ? body.count : 12;

    await dbConnect();
    const puzzles = await puzzleIssueService.issueBatch(
      req.walletAddress!,
      body.sessionId,
      moves,
      count
    );

    log?.info("puzzleRush.puzzles.issued", {
      wallet: req.walletAddress,
      sessionId: body.sessionId,
      moves,
      count: puzzles.length,
    });

    res.json({ puzzles });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("puzzleRush.puzzles.failed", err, { status: error?.status });
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch puzzles" });
  }
});

export default router;
