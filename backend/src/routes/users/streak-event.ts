import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import userModel from "../../lib/models/users.model";

const router: Router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const userData = await userModel.findOne(
      { walletAddress: walletAddress.toLowerCase() },
      { streakEvent: 1, currentStreak: 1 }
    ).lean();

    if (!userData || !userData.streakEvent?.eventType || userData.streakEvent.notified) {
      res.json({ event: null });
      return;
    }

    res.json({
      event: {
        type: userData.streakEvent.eventType,
        day: userData.streakEvent.day,
        currentStreak: userData.currentStreak ?? 0,
      },
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch streak event",
    });
  }
});

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    await userModel.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      {
        $set: {
          "streakEvent.eventType": null,
          "streakEvent.day": null,
          "streakEvent.notified": true,
        },
      }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to acknowledge streak event",
    });
  }
});

export default router;
