import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { FrontendError } from "@/lib/models/frontendError.model";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      message,
      stack,
      userAddress,
      path,
      action,
      platform,
      additionalData,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const errorEntry = new FrontendError({
      message,
      stack,
      userAddress,
      path,
      action,
      platform: platform || "others",
      status: "new",
      additionalData,
    });

    await errorEntry.save();

    return NextResponse.json({ success: true, id: errorEntry._id });
  } catch (error: any) {
    console.error("Failed to save frontend error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
