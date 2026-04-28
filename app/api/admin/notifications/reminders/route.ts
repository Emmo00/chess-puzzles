import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { verifyAdminKey, unauthorizedResponse } from "@/lib/security/admin";

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return unauthorizedResponse();
  }

  try {
    await dbConnect();

    const inactiveDays = parseInt(request.nextUrl.searchParams.get("days") || "3");

    const result = await NotificationService.sendToInactive({
      title: "We miss you! ♟️",
      body: "Come back and solve some puzzles to keep your streak alive!",
      targetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      type: "reminder",
    }, inactiveDays);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Reminder notification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
