import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import HintsService from "../../../../lib/services/hints.service";
import { withAdminAuth } from "../../../../lib/admin/middleware";

type PerkType = "hints" | "streakFreezes";

interface PerkBody {
  walletAddress: string;
  perk: PerkType;
  amount: number;
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();
  const body: PerkBody = await request.json();
  const { walletAddress, perk, amount } = body;

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ message: "Valid wallet address required" }, { status: 400 });
  }
  if (!["hints", "streakFreezes"].includes(perk)) {
    return NextResponse.json({ message: "Perk must be 'hints' or 'streakFreezes'" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ message: "Amount must be at least 1" }, { status: 400 });
  }

  const hintsService = new HintsService();
  const result =
    perk === "hints"
      ? await hintsService.grantHints(walletAddress, Math.floor(amount))
      : await hintsService.grantStreakFreezes(walletAddress, Math.floor(amount));

  return NextResponse.json({ success: true, ...result });
});
