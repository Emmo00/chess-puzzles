import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";
import {
  getClientIp,
  getDeviceFingerprintFromRequest,
} from "@/lib/security/requestProtection";
import CheckInService from "@/lib/services/checkin.service";
import UserService from "@/lib/services/users.service";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateWalletUser(request);
    const deviceFingerprint = getDeviceFingerprintFromRequest(request);
    const clientIp = getClientIp(request);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "checkin.solve",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 30, windowMs: 60_000 },
        { scopeSuffix: "wallet", key: user.walletAddress, maxRequests: 20, windowMs: 60_000 },
        { scopeSuffix: "device", key: deviceFingerprint, maxRequests: 20, windowMs: 60_000 },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await dbConnect();

    const { puzzleId } = await request.json();

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        { message: "Invalid request. puzzleId is required." },
        { status: 400 }
      );
    }

    const checkInService = new CheckInService();
    const userService = new UserService();

    const result = await checkInService.solveDailyChallenge(user.walletAddress, puzzleId);

    if (result.success && result.firstSolve) {
      let currentUser;
      try {
        currentUser = await userService.getUser(user.walletAddress);
      } catch (error: any) {
        if (error.status === 404) {
          await userService.createUser({
            walletAddress: user.walletAddress,
            displayName: user.displayName || user.walletAddress.slice(0, 8),
          });
          currentUser = await userService.getUser(user.walletAddress);
        } else {
          throw error;
        }
      }

      await userService.updateUserStreakByUTCDay(user.walletAddress);

      await userService.updateUserStats(user.walletAddress, {
        totalPoints: currentUser.totalPoints || 0,
        totalPuzzlesSolved: (currentUser.totalPuzzlesSolved || 0) + 1,
        lastPuzzleDate: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error solving check-in challenge:", error);
    return NextResponse.json(
      { message: error.message || "Failed to solve check-in challenge" },
      { status: error.status || 500 }
    );
  }
}
