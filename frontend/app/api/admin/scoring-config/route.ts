import { NextRequest, NextResponse } from "next/server";
import { type ScoringConfig, getScoringConfig, saveScoringConfig } from "../../../../lib/config/scoring";
import { withAdminAuth } from "../../../../lib/admin/middleware";

export const GET = withAdminAuth(async () => {
  const config = await getScoringConfig();
  return NextResponse.json(config);
});

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const allowed = [
    "basePointsStandard",
    "basePointsDaily",
    "hintPenalty1",
    "hintPenalty2",
    "hintFailThreshold",
    "streakCap",
    "streakStep",
    "streakCapAt",
    "speedBonus",
    "speedBonusThresholdSec",
  ];

  const current = await getScoringConfig();
  const update: Partial<ScoringConfig> = {};
  for (const key of allowed) {
    if (body[key] !== undefined && typeof body[key] === "number") {
      (update as any)[key] = body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
  }

  const merged: ScoringConfig = { ...current, ...update };
  const saved = await saveScoringConfig(merged);

  return NextResponse.json({ success: true, config: saved });
});
