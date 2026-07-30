import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import UserService from "@/lib/services/users.service";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    const userData = await userService.ensureUser(user.walletAddress);
    return NextResponse.json({
      walletAddress: userData?.walletAddress || user.walletAddress,
      displayName: userData?.displayName || user.displayName,
      hintBalance: userData?.hintBalance ?? 0,
      streakFreezes: userData?.streakFreezes ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to initialize user" },
      { status: error.status || 500 }
    );
  }
}