import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleRushService from "../../lib/services/puzzleRush.service";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    let walletAddress: string | undefined;
    const authHeader =
      (req.headers["x-wallet-address"] as string) ||
      req.headers.authorization?.replace("Bearer ", "") ||
      (req.query.walletAddress as string);

    if (authHeader && /^0x[a-fA-F0-9]{40}$/.test(authHeader)) {
      walletAddress = authHeader.toLowerCase();
    }

    const periodParam = (req.query.period as string) || "all";
    const rawLimit = Number(req.query.limit || 50);
    const rawOffset = Number(req.query.offset || 0);

    if (!["all", "today", "week"].includes(periodParam)) {
      res.status(400).json({ message: "Invalid period" });
      return;
    }
    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 50, 1),
      200
    );
    const offset = Math.max(
      Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0,
      0
    );

    await dbConnect();
    const service = new PuzzleRushService();
    const payload = await service.getLeaderboard(
      periodParam as "all" | "today" | "week",
      limit,
      offset,
      walletAddress
    );
    res.json(payload);
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch leaderboard" });
  }
});

export default router;
