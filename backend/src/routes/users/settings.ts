import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import { authenticateWallet } from "../../middleware/auth";
import UserService from "../../lib/services/users.service";
import { UserSettings } from "@workspace/db";

const router: Router = Router();

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const userService = new UserService();
    const settings = await userService.getUserSettings(walletAddress);
    res.json(settings);
  } catch (error: any) {
    console.error("Error getting user settings:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to get user settings",
    });
  }
});

router.put("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const body = req.body;

    const { ratingRange, disabledThemes } = body as Partial<UserSettings>;

    if (ratingRange) {
      if (typeof ratingRange.min !== "number" || typeof ratingRange.max !== "number") {
        res.status(400).json({ message: "Invalid rating range format" });
        return;
      }
      if (ratingRange.min > ratingRange.max) {
        res.status(400).json({ message: "Minimum rating cannot be greater than maximum rating" });
        return;
      }
      if (ratingRange.min < 400 || ratingRange.max > 3000) {
        res.status(400).json({ message: "Rating must be between 400 and 3000" });
        return;
      }
    }

    if (disabledThemes !== undefined && !Array.isArray(disabledThemes)) {
      res.status(400).json({ message: "Disabled themes must be an array" });
      return;
    }

    const userService = new UserService();
    const updatedSettings = await userService.updateUserSettings(walletAddress, {
      ratingRange,
      disabledThemes,
    });

    res.json(updatedSettings);
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to update user settings",
    });
  }
});

export default router;
