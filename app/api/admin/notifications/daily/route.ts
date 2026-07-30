import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { withAdminAuth } from "@/lib/admin/middleware";
import { getUtcDayNumber } from "@/lib/utils/time";

export const POST = withAdminAuth(async () => {
  await dbConnect();

  const utcDay = getUtcDayNumber(new Date());
  const sent = await NotificationService.sendDailyChallengeNotifications(utcDay);
  return NextResponse.json({ success: true, sent });
});
