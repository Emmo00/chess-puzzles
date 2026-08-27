import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import UserService from "../../lib/services/users.service";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const walletAddress = (req as any).walletAddress as string;
    const userService = new UserService();
    const userData = await userService.ensureUser(walletAddress);

    const freeHints = userData?.hintBalance ?? 0;
    const freeStreakFreezes = userData?.streakFreezes ?? 0;

    let contractHints = 0;
    let contractFreezes = 0;
    if (GAME_ASSETS_CONTRACT) {
      try {
        const [hints, freezes] = await Promise.all([
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getHintBalance",
            args: [walletAddress as `0x${string}`],
          }),
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getStreakFreezeBalance",
            args: [walletAddress as `0x${string}`],
          }),
        ]);
        contractHints = Number(hints);
        contractFreezes = Number(freezes);
      } catch {
        // Contract read failure shouldn't hide DB freebies
      }
    }

    res.json({
      walletAddress: userData?.walletAddress || walletAddress,
      displayName: userData?.displayName,
      hintBalance: contractHints + freeHints,
      streakFreezes: contractFreezes + freeStreakFreezes,
      contractHints,
      freeHints,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to initialize user",
    });
  }
});

export default router;
