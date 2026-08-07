import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import userModel from "@/lib/models/users.model";
import { runRequest, type Logger } from "@/lib/api/withLogging";
import { maskAddress } from "@/lib/logger";

export async function GET(request: NextRequest) {
  return runRequest(request, "/api/users/freebies", async (req, log) => {
    try {
      const user = await authenticateWalletUser(req);
      const lower = user.walletAddress.toLowerCase();
      const userData = await userModel.findOne(
        { walletAddress: lower },
        { hintBalance: 1, streakFreezes: 1 }
      ).lean();

      if (!userData) {
        log.info("users.freebies.none", { wallet: maskAddress(lower) });
        return NextResponse.json({ freeHints: 0, freeStreakFreezes: 0 });
      }

      log.info("users.freebies.found", {
        wallet: maskAddress(lower),
        freeHints: userData.hintBalance ?? 0,
        freeStreakFreezes: userData.streakFreezes ?? 0,
      });

      return NextResponse.json({
        freeHints: userData.hintBalance ?? 0,
        freeStreakFreezes: userData.streakFreezes ?? 0,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error("users.freebies.failed", err, { status: error?.status });
      return NextResponse.json(
        { message: error.message || "Failed to fetch freebies" },
        { status: error.status || 500 }
      );
    }
  });
}