import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import { authenticateWallet } from "../../middleware/auth";
import UserService from "../../lib/services/users.service";
import userModel from "../../lib/models/users.model";
import { getUtcDayNumber } from "../../lib/utils/time";
import { GAME_ASSETS_CONTRACT } from "../../lib/config/wagmi";
import { GAME_ASSETS_ABI } from "../../lib/abi/gameAssets";
import { publicClient } from "../../config/publicClient";

const router = Router();

export type StreakStatus = "alive" | "at_risk" | "broken";

async function getContractStreakFreezes(address: string): Promise<number> {
  if (!GAME_ASSETS_CONTRACT) return 0;
  try {
    const balance = await publicClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "getStreakFreezeBalance",
      args: [address as `0x${string}`],
    });
    return Number(balance);
  } catch {
    return 0;
  }
}

function computeEffectiveStreak(
  currentStreak: number,
  lastPuzzleDate: string | null | undefined,
  streakFreezes: number
): { effectiveStreak: number; streakStatus: StreakStatus } {
  const today = getUtcDayNumber();

  if (!lastPuzzleDate) {
    return { effectiveStreak: 0, streakStatus: "alive" };
  }

  const lastUtcDay = getUtcDayNumber(new Date(lastPuzzleDate));

  if (lastUtcDay === today || lastUtcDay === today - 1) {
    return { effectiveStreak: currentStreak, streakStatus: "alive" };
  }

  if (lastUtcDay < today - 1 && streakFreezes > 0) {
    return { effectiveStreak: currentStreak, streakStatus: "at_risk" };
  }

  return { effectiveStreak: 1, streakStatus: "broken" };
}

router.get("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();

    const walletAddress = (req as any).walletAddress as string;
    const userService = new UserService();

    let userData: {
      currentStreak: number;
      longestStreak: number;
      totalPuzzlesSolved: number;
      totalPoints: number;
      lastPuzzleDate: string | null;
      lastLogin: Date;
    };
    try {
      const u = await userService.getUser(walletAddress);
      userData = {
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        totalPuzzlesSolved: u.totalPuzzlesSolved,
        totalPoints: u.totalPoints,
        lastPuzzleDate: u.lastPuzzleDate,
        lastLogin: u.lastLogin,
      };
    } catch {
      userData = {
        currentStreak: 0,
        longestStreak: 0,
        totalPuzzlesSolved: 0,
        totalPoints: 0,
        lastPuzzleDate: null,
        lastLogin: new Date(),
      };
    }

    const [contractFreezes, dbUser] = await Promise.all([
      getContractStreakFreezes(walletAddress),
      userModel.findOne(
        { walletAddress: walletAddress.toLowerCase() },
        { streakFreezes: 1 }
      ).lean(),
    ]);
    const dbFreezes = (dbUser?.streakFreezes ?? 0);
    const totalStreakFreezes = contractFreezes + dbFreezes;

    const { effectiveStreak, streakStatus } = computeEffectiveStreak(
      userData.currentStreak || 0,
      userData.lastPuzzleDate,
      totalStreakFreezes
    );

    log?.info("users.streak", {
      wallet: walletAddress.slice(0, 6) + "...",
      effectiveStreak,
      streakStatus,
      totalStreakFreezes,
    });

    res.json({
      currentStreak: effectiveStreak,
      longestStreak: userData.longestStreak || 0,
      totalPuzzlesSolved: userData.totalPuzzlesSolved || 0,
      points: userData.totalPoints || 0,
      streakStatus,
      streakFreezes: totalStreakFreezes,
      lastLogin: userData.lastLogin,
      lastPuzzleDate: userData.lastPuzzleDate,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("streak.fetch.failed", err, { status: error?.status });
    res.status(error.message === "Wallet address not provided" ? 400 : 500).json({
      message: error.message || "Failed to fetch user streak",
    });
  }
});

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();

    const walletAddress = (req as any).walletAddress as string;
    const userService = new UserService();

    const userData = await userService.updateUserStreakByUTCDay(walletAddress);
    log?.info("streak.update", {
      walletAddress: walletAddress.slice(0, 6) + "...",
      currentStreak: userData?.currentStreak,
    });

    res.json({
      success: true,
      streak: userData?.currentStreak || 0,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("streak.update.failed", err, { status: error?.status });
    res.status(error.message === "Wallet address not provided" ? 400 : error.status || 500).json({
      message: error.message || "Failed to update streak",
    });
  }
});

export default router;
