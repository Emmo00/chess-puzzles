import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { withAdminAuth } from "@/lib/admin/middleware";

export const POST = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();

  const body = await request.json();
  const { title, description, destinationUrl } = body;

  if (!title || !description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const sent = await NotificationService.sendCustomNotification({ title, description, destinationUrl });
  return NextResponse.json({ success: true, sent });
});
