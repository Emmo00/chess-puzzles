import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
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

    const { wallet, assetType, quantity } = await req.json();

    if (!wallet || !assetType || !quantity) {
      return NextResponse.json(
        { error: "Wallet, assetType, and quantity are required" },
        { status: 400 }
      );
    }

    // Call the backend API to grant the asset
    // The backend holds the GRANTER_ROLE and can execute this
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/hints/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the admin session cookie if needed
        Cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({ wallet, assetType, quantity }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to grant asset");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Grant asset failed:", error.message);
    return NextResponse.json({ error: error.message || "Failed to grant asset" }, { status: 500 });
  }
}
