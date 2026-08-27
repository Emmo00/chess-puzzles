import { NextResponse } from "next/server";
import { getAccessConfig } from "../../../../lib/config/access";

export async function GET() {
  const config = await getAccessConfig();
  return NextResponse.json({
    dailyFreePuzzles: config.dailyFreePuzzles,
    unlockAmountUsd: config.unlockAmountUsd,
    defaultHints: config.defaultHints,
    defaultStreakFreezes: config.defaultStreakFreezes,
  });
}
