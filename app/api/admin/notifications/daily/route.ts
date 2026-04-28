import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { verifyAdminKey, unauthorizedResponse } from "@/lib/security/admin";
import { getUtcDayNumber } from "@/lib/utils/time";

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return unauthorizedResponse();
  }

  try {
    await dbConnect();

    const utcDay = getUtcDayNumber(new Date());
    const dateStr = utcDay.toString();

    const result = await NotificationService.sendToAll({
      title: "Daily Chess Puzzle 🧩",
      body: "A new daily challenge is waiting for you! Can you solve it?",
      targetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/daily-challenge`,
      type: "daily",
      date: dateStr,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Daily notification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
