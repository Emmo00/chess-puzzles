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
      { streakEvent: 1, currentStreak: 1 }
    ).lean();

    if (!userData || !userData.streakEvent?.eventType || userData.streakEvent.notified) {
      return NextResponse.json({ event: null });
    }

    return NextResponse.json({
      event: {
        type: userData.streakEvent.eventType,
        day: userData.streakEvent.day,
        currentStreak: userData.currentStreak ?? 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch streak event" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    await userModel.findOneAndUpdate(
      { walletAddress: user.walletAddress.toLowerCase() },
      {
        $set: {
          "streakEvent.eventType": null,
          "streakEvent.day": null,
          "streakEvent.notified": true,
        },
      }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to acknowledge streak event" },
      { status: error.status || 500 }
    );
  }
}
