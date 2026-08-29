import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@workspace/db";
import { AppConfig } from "@workspace/db";

export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const configs = await AppConfig.find().lean();
    return NextResponse.json({ configs });
  } catch (error: any) {
    console.error("Config fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Verify admin session
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = await req.json();

    if (!key || !value) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    if (!["scoring", "access", "puzzleRush"].includes(key)) {
      return NextResponse.json({ error: "Invalid config key" }, { status: 400 });
    }

    await dbConnect();

    const config = await AppConfig.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error("Config update failed:", error.message);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
