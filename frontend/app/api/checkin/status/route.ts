import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import { getClientIp } from "@/lib/security/requestProtection";
import CheckInService from "@/lib/services/checkin.service";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const checkInService = new CheckInService();
    let walletAddress: string | undefined;

    const queryWallet = new URL(request.url).searchParams.get("walletAddress");
    if (queryWallet && ADDRESS_REGEX.test(queryWallet)) {
      walletAddress = queryWallet.toLowerCase();
    }

    if (!walletAddress) {
      try {
        const user = await authenticateWalletUser(request);
        walletAddress = user.walletAddress;
      } catch {
        walletAddress = undefined;
      }
    }

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "checkin.status",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 90, windowMs: 60_000 },
        {
          scopeSuffix: "wallet",
          key: walletAddress || `anonymous:${clientIp}`,
          maxRequests: 60,
          windowMs: 60_000,
        },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    const status = await checkInService.getDailyStatus(walletAddress);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Error fetching check-in status:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch check-in status" },
      { status: error.status || 500 }
    );
  }
}
