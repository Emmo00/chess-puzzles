import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { DailyChallenge } from "@/lib/models/dailyChallenge.model";
import { CheckInReservation } from "@/lib/models/checkInReservation.model";
import userPuzzlesModel from "@/lib/models/userPuzzles.model";
import onchainStore from "@/lib/services/onchain-store.service";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const results = {
      dailyChallenges: 0,
      reservations: 0,
      puzzleAttempts: 0,
      errors: [] as string[],
    };

    // 1. Sync Daily Challenges
    const unsyncedChallenges = await DailyChallenge.find({ onChainSynced: { $ne: true } });
    for (const challenge of unsyncedChallenges) {
      try {
        await onchainStore.setDailyPuzzle(
          challenge.utcDay,
          challenge.puzzle.puzzleId,
          challenge.checkInAmountWeiSnapshot,
          challenge.maxDailyCheckInsSnapshot
        );
        challenge.onChainSynced = true;
        await challenge.save();
        results.dailyChallenges++;
      } catch (err: any) {
        results.errors.push(`DailyChallenge ${challenge.utcDay}: ${err.message}`);
      }
    }

    // 2. Sync Reservations
    const unsyncedReservations = await CheckInReservation.find({ onChainSynced: { $ne: true } });
    for (const res of unsyncedReservations) {
      try {
        const status = onchainStore.mapStatusToEnum(res.status);
        await onchainStore.setReservation(
          res.utcDay,
          res.walletAddress,
          status,
          res.checkInAmountWei,
          res.solvedAt ? Math.floor(res.solvedAt.getTime() / 1000) : 0
        );
        res.onChainSynced = true;
        await res.save();
        results.reservations++;
      } catch (err: any) {
        results.errors.push(`Reservation ${res.walletAddress}/${res.utcDay}: ${err.message}`);
      }
    }

    // 3. Sync Puzzle Attempts
    const unsyncedAttempts = await userPuzzlesModel.find({ onChainSynced: { $ne: true } });
    for (const attempt of unsyncedAttempts) {
      try {
        await onchainStore.recordPuzzleAttempt(
          attempt.userWalletAddress,
          attempt.puzzleId,
          attempt.completed,
          attempt.attempts,
          attempt.points,
          attempt.solvedAt ? Math.floor(attempt.solvedAt.getTime() / 1000) : 0
        );
        attempt.onChainSynced = true;
        await attempt.save();
        results.puzzleAttempts++;
      } catch (err: any) {
        results.errors.push(`PuzzleAttempt ${attempt.userWalletAddress}/${attempt.puzzleId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Error in onchain-sync:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
