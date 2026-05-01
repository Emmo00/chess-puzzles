import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { DailyChallenge } from "@/lib/models/dailyChallenge.model";
import { CheckInReservation } from "@/lib/models/checkInReservation.model";
import userPuzzlesModel from "@/lib/models/userPuzzles.model";
import onchainStore from "@/lib/services/onchain-store.service";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-admin-key");
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

    let currentNonce = await onchainStore.getTransactionCount();
    console.log(`Starting sync with initial nonce: ${currentNonce}`);

    const MAX_SYNC_LIMIT = 30;
    let processedCount = 0;

    // 1. Sync Daily Challenges
    const unsyncedChallenges = await DailyChallenge.find({ onChainSynced: { $ne: true } }).limit(MAX_SYNC_LIMIT);
    console.log(`Found ${unsyncedChallenges.length} unsynced daily challenges.`);
    for (const challenge of unsyncedChallenges) {
      if (processedCount >= MAX_SYNC_LIMIT) break;
      try {
        const hash = await onchainStore.setDailyPuzzle(
          challenge.utcDay,
          challenge.puzzle.puzzleId,
          challenge.checkInAmountWeiSnapshot,
          challenge.maxDailyCheckInsSnapshot,
          currentNonce++
        );
        
        const receipt = await onchainStore.waitForReceipt(hash);
        if (receipt.status === "success") {
          challenge.onChainSynced = true;
          await challenge.save();
          results.dailyChallenges++;
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }
      } catch (err: any) {
        results.errors.push(`DailyChallenge ${challenge.utcDay}: ${err.message}`);
      } finally {
        processedCount++;
      }
    }

    // 2. Sync Reservations
    if (processedCount < MAX_SYNC_LIMIT) {
      const unsyncedReservations = await CheckInReservation.find({ onChainSynced: { $ne: true } }).limit(MAX_SYNC_LIMIT - processedCount);
      console.log(`Found ${unsyncedReservations.length} unsynced reservations.`);
      for (const res of unsyncedReservations) {
        if (processedCount >= MAX_SYNC_LIMIT) break;
        try {
          const status = onchainStore.mapStatusToEnum(res.status);
          const hash = await onchainStore.setReservation(
            res.utcDay,
            res.walletAddress,
            status,
            res.checkInAmountWei,
            res.solvedAt ? Math.floor(res.solvedAt.getTime() / 1000) : 0,
            currentNonce++
          );
          
          const receipt = await onchainStore.waitForReceipt(hash);
          if (receipt.status === "success") {
            res.onChainSynced = true;
            await res.save();
            results.reservations++;
          } else {
            throw new Error(`Transaction failed with status: ${receipt.status}`);
          }
        } catch (err: any) {
          results.errors.push(`Reservation ${res.walletAddress}/${res.utcDay}: ${err.message}`);
        } finally {
          processedCount++;
        }
      }
    }

    // 3. Sync Puzzle Attempts
    if (processedCount < MAX_SYNC_LIMIT) {
      const unsyncedAttempts = await userPuzzlesModel.find({ onChainSynced: { $ne: true } }).limit(MAX_SYNC_LIMIT - processedCount);
      console.log(`Found ${unsyncedAttempts.length} unsynced puzzle attempts.`);
      for (const attempt of unsyncedAttempts) {
        if (processedCount >= MAX_SYNC_LIMIT) break;
        try {
          const hash = await onchainStore.recordPuzzleAttempt(
            attempt.userWalletAddress,
            attempt.puzzleId,
            attempt.completed,
            attempt.attempts,
            attempt.points,
            attempt.solvedAt ? Math.floor(attempt.solvedAt.getTime() / 1000) : 0,
            currentNonce++
          );
          
          const receipt = await onchainStore.waitForReceipt(hash);
          if (receipt.status === "success") {
            attempt.onChainSynced = true;
            await attempt.save();
            results.puzzleAttempts++;
          } else {
            throw new Error(`Transaction failed with status: ${receipt.status}`);
          }
        } catch (err: any) {
          results.errors.push(`PuzzleAttempt ${attempt.userWalletAddress}/${attempt.puzzleId}: ${err.message}`);
        } finally {
          processedCount++;
        }
      }
    }
    
    console.log(`Sync complete. Results: ${JSON.stringify(results)}`);

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
