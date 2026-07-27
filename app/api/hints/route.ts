import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import { authenticateWalletUser } from "../../../lib/auth";
import HintsService from "../../../lib/services/hints.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const hintsService = new HintsService();
    const balance = await hintsService.getBalance(user.walletAddress);
    return NextResponse.json(balance);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch hint balance" },
      { status: error.status || 500 }
    );
  }
}
