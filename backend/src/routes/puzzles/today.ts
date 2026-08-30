import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import PuzzleService from "../../lib/services/puzzles.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();

    const puzzleService = new PuzzleService();
    const puzzle = await puzzleService.fetchNewSolvePuzzle();

    res.json(puzzle);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch daily puzzle" });
  }
});

export default router;
