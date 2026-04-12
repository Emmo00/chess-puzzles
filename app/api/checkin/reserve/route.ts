import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import CheckInService from "@/lib/services/checkin.service";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const checkInService = new CheckInService();

    const result = await checkInService.reserveDailyChallenge(user.walletAddress);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error reserving check-in challenge:", error);
    return NextResponse.json(
      { message: error.message || "Failed to reserve daily challenge" },
      { status: error.status || 500 }
    );
  }
}
