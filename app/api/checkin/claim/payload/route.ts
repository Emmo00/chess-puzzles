import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import CheckInService from "@/lib/services/checkin.service";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const checkInService = new CheckInService();

    const claim = await checkInService.getFreshClaimPayload(user.walletAddress);

    return NextResponse.json({
      success: true,
      claim,
    });
  } catch (error: any) {
    console.error("Error creating check-in claim payload:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create check-in claim payload" },
      { status: error.status || 500 }
    );
  }
}
