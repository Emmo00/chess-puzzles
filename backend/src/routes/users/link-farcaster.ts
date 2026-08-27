import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import UserService from "../../lib/services/users.service";

const router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const { fid } = req.body;

    if (!fid) {
      res.status(400).json({ message: "FID is required" });
      return;
    }

    const userService = new UserService();
    await userService.linkFarcasterFid(walletAddress, fid);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error linking Farcaster FID:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to link Farcaster FID",
    });
  }
});

export default router;
