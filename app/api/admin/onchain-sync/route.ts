import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { DailyChallenge } from "@/lib/models/dailyChallenge.model";
import { CheckInReservation } from "@/lib/models/checkInReservation.model";
import userPuzzlesModel from "@/lib/models/userPuzzles.model";
import onchainStore from "@/lib/services/onchain-store.service";
import { withAdminAuth } from "@/lib/admin/middleware";

export const POST = withAdminAuth(async () => {
  await dbConnect();

  const results = {
    dailyChallenges: 0,
    reservations: 0,
    puzzleAttempts: 0,
    onchainData: { puzzles: 0, reservations: 0 },
  };

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const dailyChallenges = await DailyChallenge.find({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  }).lean();

  const reservations = await CheckInReservation.find({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  }).lean();

  for (const dc of dailyChallenges) {
    try {
      const result = await onchainStore.pushPuzzleMetadata(0, {
        puzzleId: dc.puzzleId,
        fen: dc.fen,
        rating: dc.rating,
        ratingDeviation: dc.ratingDeviation,
        moves: dc.moves,
        themes: dc.themes,
      });
      if (result) results.onchainData.puzzles++;
    } catch (e: unknown) {
      console.error("onchain sync error (puzzle):", e);
    }
  }

  for (const resv of reservations) {
    try {
      const result = await onchainStore.pushReservation(0, {
        walletAddress: resv.walletAddress,
        puzzleId: resv.puzzleId,
        expiresAt: resv.expiresAt,
        status: resv.status,
      });
      if (result) results.onchainData.reservations++;
    } catch (e: unknown) {
      console.error("onchain sync error (reservation):", e);
    }
  }

  results.dailyChallenges = dailyChallenges.length;
  results.reservations = reservations.length;

  return NextResponse.json({ success: true, results });
});
