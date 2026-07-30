import { NextRequest, NextResponse } from "next/server";
import { authenticateWalletUser } from "../../../../lib/auth";
import HintsService from "../../../../lib/services/hints.service";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateWalletUser(request);
    const hintsService = new HintsService();
    const result = await hintsService.consumeHint(user.walletAddress);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to consume hint" },
      { status: error.status || 500 }
    );
  }
}