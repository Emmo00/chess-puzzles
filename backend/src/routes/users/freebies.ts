import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import userModel from "../../lib/models/users.model";
import { maskAddress } from "../../middleware/logging";

const router: Router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    const walletAddress = (req as any).walletAddress as string;
    await dbConnect();
    const lower = walletAddress.toLowerCase();
    const userData = await userModel.findOne(
      { walletAddress: lower },
      { hintBalance: 1, streakFreezes: 1 }
    ).lean();

    if (!userData) {
      log?.info("users.freebies.none", { wallet: maskAddress(lower) });
      res.json({ freeHints: 0, freeStreakFreezes: 0 });
      return;
    }

    log?.info("users.freebies.found", {
      wallet: maskAddress(lower),
      freeHints: userData.hintBalance ?? 0,
      freeStreakFreezes: userData.streakFreezes ?? 0,
    });

    res.json({
      freeHints: userData.hintBalance ?? 0,
      freeStreakFreezes: userData.streakFreezes ?? 0,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("users.freebies.failed", err, { status: error?.status });
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch freebies",
    });
  }
});

export default router;
