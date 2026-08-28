import { Router, Request, Response } from "express";
import { type Hex } from "viem";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import UserService from "../../lib/services/users.service";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const userService = new UserService();
    const userData = await userService.ensureUser(walletAddress);

    let hintBalance = 0;
    let streakFreezes = 0;

    if (GAME_ASSETS_CONTRACT) {
      try {
        const [hints, freezes] = await Promise.all([
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getHintBalance",
            args: [walletAddress as Hex],
          }),
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getStreakFreezeBalance",
            args: [walletAddress as Hex],
          }),
        ]);
        hintBalance = Number(hints);
        streakFreezes = Number(freezes);
      } catch {
        // Contract read failure — return zeros
      }
    }

    res.json({
      walletAddress: userData?.walletAddress || walletAddress,
      displayName: userData?.displayName,
      hintBalance,
      streakFreezes,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to initialize user",
    });
  }
});

export default router;
