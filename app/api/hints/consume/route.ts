import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import userModel from "@/lib/models/users.model";
import HintsService from "@/lib/services/hints.service";
import { devErrorBody } from "@/lib/utils/devResponse";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const lower = user.walletAddress.toLowerCase();

    // Try to consume from DB free allowance first
    const dbUser = await userModel.findOneAndUpdate(
      { walletAddress: lower, hintBalance: { $gt: 0 } },
      { $inc: { hintBalance: -1 } },
      { returnDocument: "after" }
    );

    if (dbUser) {
      return NextResponse.json({ success: true, source: "free" });
    }

    // Fall through to contract for purchased hints
    const hintsService = new HintsService();
    const result = await hintsService.consumeHint(user.walletAddress);
    return NextResponse.json({ ...result, source: "contract" });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Failed to consume hint",
        ...devErrorBody(error),
      },
      { status: error.status || 500 }
    );
  }
}