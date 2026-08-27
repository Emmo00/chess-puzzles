import { NextRequest, NextResponse } from "next/server";
import { type AccessConfig, getAccessConfig, saveAccessConfig } from "../../../../lib/config/access";
import { withAdminAuth } from "../../../../lib/admin/middleware";

export const GET = withAdminAuth(async () => {
  const config = await getAccessConfig();
  return NextResponse.json(config);
});

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const allowed = ["dailyFreePuzzles", "unlockAmountUsd", "unlockDurationHours", "defaultHints", "defaultStreakFreezes"];
  const current = await getAccessConfig();
  const update: Partial<AccessConfig> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "unlockAmountUsd" && typeof body[key] === "string") {
        (update as any)[key] = body[key];
      } else if (typeof body[key] === "number") {
        (update as any)[key] = body[key];
      }
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
  }
  const merged: AccessConfig = { ...current, ...update };
  const saved = await saveAccessConfig(merged);
  return NextResponse.json({ success: true, config: saved });
});
