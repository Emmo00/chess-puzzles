import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { withAdminAuth } from "@/lib/admin/middleware";

export const POST = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();

  const inactiveDays = parseInt(request.nextUrl.searchParams.get("days") || "3");
  const sent = await NotificationService.sendReminderNotifications(inactiveDays);
  return NextResponse.json({ success: true, sent });
});
