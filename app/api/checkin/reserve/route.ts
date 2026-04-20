import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import {
  getClientIp,
  getDeviceFingerprintFromRequest,
} from "@/lib/security/requestProtection";
import CheckInService from "@/lib/services/checkin.service";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateWalletUser(request);
    const deviceFingerprint = getDeviceFingerprintFromRequest(request);
    const clientIp = getClientIp(request);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "checkin.reserve",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 20, windowMs: 60_000 },
        { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 8, windowMs: 60_000 },
        { scopeSuffix: "device", key: deviceFingerprint, maxRequests: 6, windowMs: 60_000 },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    const checkInService = new CheckInService();

    const result = await checkInService.reserveDailyChallenge(
      user.walletAddress,
      deviceFingerprint
    );

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
