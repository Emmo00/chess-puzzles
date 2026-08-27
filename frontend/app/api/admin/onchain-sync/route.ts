import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { DailyChallenge } from "@/lib/models/dailyChallenge.model";
import { CheckInReservation } from "@/lib/models/checkInReservation.model";
import { withAdminAuth } from "@/lib/admin/middleware";

export const POST = withAdminAuth(async () => {
  await dbConnect();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const dailyChallenges = await DailyChallenge.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  });

  const reservations = await CheckInReservation.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
  });

  return NextResponse.json({
    success: true,
    results: {
      dailyChallenges,
      reservations,
      onchainData: { puzzles: 0, reservations: 0 },
      note: "On-chain sync disabled - contract methods not implemented",
    },
  });
});