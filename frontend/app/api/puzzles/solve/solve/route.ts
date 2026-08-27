import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import { authenticateWalletUser } from "../../../../../lib/auth";
import PuzzleService from "../../../../../lib/services/puzzles.service";
import UserService from "../../../../../lib/services/users.service";
import { calculateEarnedPoints } from "../../../../../lib/scoring";
import AdaptiveService from "../../../../../lib/services/adaptive.service";
import RewardsService from "../../../../../lib/services/rewards.service";
import { UserPuzzle } from "../../../../../lib/types";
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/puzzles/solve/solve", async (req, log) => {
    try {
      await dbConnect();

      const user = await authenticateWalletUser(req);
      const body = await req.json();
      const { puzzleId, mistakes, hintCount = 0, rating, solveTimeSec } = body;

      log.info("puzzle.solve.start", {
        wallet: maskAddress(user.walletAddress),
        puzzleId,
        mistakes,
        hintCount,
        rating,
      });

      if (!puzzleId || typeof mistakes !== "number" || typeof rating !== "number") {
        log.warn("puzzle.solve.invalidBody", { wallet: maskAddress(user.walletAddress) });
        return NextResponse.json(
          { message: "Invalid request body. Required: puzzleId, mistakes, rating" },
          { status: 400 }
        );
      }

      const puzzleService = new PuzzleService();
      const userService = new UserService();

      const currentUser = await userService.ensureUser(user.walletAddress);

      const streakUser = await userService.updateUserStreakByUTCDay(user.walletAddress);
      const breakdown = calculateEarnedPoints({
        kind: "standard",
        hintCount: hintCount || 0,
        streak: streakUser.currentStreak || 1,
        solveTimeSec:
          typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
            ? solveTimeSec
            : Number.MAX_SAFE_INTEGER,
      });
      const points = breakdown.points;
      log.debug("puzzle.solve.scored", {
        wallet: maskAddress(user.walletAddress),
        puzzleId,
        points,
        streak: streakUser.currentStreak || 1,
      });

      const userPuzzleData: Partial<UserPuzzle> = {
        userWalletAddress: user.walletAddress,
        puzzleId,
        type: "solve",
        completed: true,
        attempts: mistakes + 1,
        points,
        solvedAt: new Date(),
      };

      const updatedUserPuzzle = await puzzleService.updateUserPuzzle(userPuzzleData);

      if (updatedUserPuzzle) {
        const refreshedUser = await userService.getUser(user.walletAddress);
        const oldPoints = refreshedUser.totalPoints || 0;
        const newPoints = oldPoints + (userPuzzleData.points ?? 0);
        const newTotalSolved = (refreshedUser.totalPuzzlesSolved || 0) + 1;

        await userService.updateUserStats(user.walletAddress, {
          totalPoints: newPoints,
          totalPuzzlesSolved: newTotalSolved,
          lastPuzzleDate: new Date().toISOString(),
        });

        try {
          const adaptiveService = new AdaptiveService();
          await adaptiveService.updateRatingAfterSolve(user.walletAddress, {
            solveTimeSec:
              typeof solveTimeSec === "number" && Number.isFinite(solveTimeSec)
                ? solveTimeSec
                : 120,
            hints: hintCount || 0,
            mistakes,
            puzzleRating: rating,
            failed: (hintCount || 0) >= 3,
          });
        } catch (adaptiveError) {
          const err = adaptiveError instanceof Error ? adaptiveError : new Error(String(adaptiveError));
          log.error("puzzle.solve.adaptiveFailed", err, {
            wallet: maskAddress(user.walletAddress),
            puzzleId,
          });
        }

        try {
          const rewardsService = new RewardsService();
          const levelUp = await rewardsService.processLevelUp(
            user.walletAddress,
            oldPoints,
            newPoints
          );
          log.info("puzzle.solve-rewards.processed", {
            wallet: maskAddress(user.walletAddress),
            oldPoints,
            newPoints,
            leveledUp: !!levelUp,
          });
          if (levelUp) {
            return NextResponse.json({
              message: "Puzzle solved successfully",
              points: userPuzzleData.points,
              breakdown,
              levelUp,
              puzzle: updatedUserPuzzle,
            });
          }
        } catch (rewardError) {
          const err = rewardError instanceof Error ? rewardError : new Error(String(rewardError));
          log.error("puzzle.solve.rewardsFailed", err, {
            wallet: maskAddress(user.walletAddress),
            oldPoints,
            newPoints,
          });
        }
      }

      log.info("puzzle.solve.complete", {
        wallet: maskAddress(user.walletAddress),
        puzzleId,
        points,
      });

      return NextResponse.json({
        message: "Puzzle solved successfully",
        points: userPuzzleData.points,
        breakdown,
        puzzle: updatedUserPuzzle,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("puzzle.solve.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to solve puzzle" },
        { status: error.status || 500 }
      );
    }
  });
}