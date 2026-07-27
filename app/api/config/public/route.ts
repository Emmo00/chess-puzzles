import { NextResponse } from "next/server";
import { getAccessConfig } from "../../../../lib/config/access";

export async function GET() {
  try {
    const config = await getAccessConfig();
    return NextResponse.json({
      dailyFreePuzzles: config.dailyFreePuzzles,
      unlockAmountUsd: config.unlockAmountUsd,
      defaultHints: config.defaultHints,
      defaultStreakFreezes: config.defaultStreakFreezes,
    });
  } catch {
    return NextResponse.json({ dailyFreePuzzles: 3, unlockAmountUsd: "0.01", defaultHints: 5, defaultStreakFreezes: 1 });
  }
}
