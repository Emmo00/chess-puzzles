import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import UserService from "@/lib/services/users.service";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const { fid } = await request.json();

    if (!fid) {
      return NextResponse.json({ message: "FID is required" }, { status: 400 });
    }

    const userService = new UserService();
    await userService.linkFarcasterFid(user.walletAddress, fid);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error linking Farcaster FID:", error);
    return NextResponse.json(
      { message: error.message || "Failed to link Farcaster FID" },
      { status: error.status || 500 }
    );
  }
}
