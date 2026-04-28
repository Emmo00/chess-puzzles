import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { NotificationService } from "@/lib/services/notification.service";
import { verifyAdminKey, unauthorizedResponse } from "@/lib/security/admin";

export async function POST(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return unauthorizedResponse();
  }

  try {
    await dbConnect();

    const body = await request.json();
    const { title, description, destinationUrl } = body;

    if (!title || !description || !destinationUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields: title, description, destinationUrl" }, { status: 400 });
    }

    const result = await NotificationService.sendToAll({
      title,
      body: description,
      targetUrl: destinationUrl,
      type: "custom",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Custom notification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
