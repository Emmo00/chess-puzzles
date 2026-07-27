import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin/middleware";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    return NextResponse.json({ authenticated: true, address: session.address, role: session.role });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
