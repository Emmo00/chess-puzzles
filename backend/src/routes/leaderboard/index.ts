import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import LeaderboardService from "../../lib/services/leaderboard.service";
import type { League } from "../../lib/leagues";

const router: Router = Router();

const VALID_LEAGUES = new Set(["king", "knight", "pawn"]);

router.get("/", async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const walletAddress = (req.query.walletAddress as string) || undefined;
    const leagueParam = (req.query.league as string) || undefined;
    const leagueFilter = leagueParam && VALID_LEAGUES.has(leagueParam)
      ? (leagueParam as League)
      : null;

    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));

    const leaderboardService = new LeaderboardService();
    const result = await leaderboardService.getLeaderboard(
      validPage,
      validLimit,
      walletAddress,
      leagueFilter
    );

    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to get leaderboard" });
  }
});

export default router;
