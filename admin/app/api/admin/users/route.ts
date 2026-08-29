import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@workspace/db";
import { User } from "@workspace/db";

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

    const search = req.nextUrl.searchParams.get("search");
    const query: any = {};

    if (search) {
      query.walletAddress = { $regex: search, $options: "i" };
    }

    const users = await User.find(query)
      .sort({ totalPoints: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Users fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
