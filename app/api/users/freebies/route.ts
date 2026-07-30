import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import userModel from "@/lib/models/users.model";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const userData = await userModel.findOne(
      { walletAddress: user.walletAddress.toLowerCase() },
      { hintBalance: 1, streakFreezes: 1 }
    ).lean();

    if (!userData) {
      return NextResponse.json({ freeHints: 0, freeStreakFreezes: 0 });
    }

    return NextResponse.json({
      freeHints: userData.hintBalance ?? 0,
      freeStreakFreezes: userData.streakFreezes ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch freebies" },
      { status: error.status || 500 }
    );
  }
}