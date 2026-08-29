import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@workspace/db";
import { Nonce } from "@workspace/db";
import { isAdminWallet } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!isAdminWallet(address)) {
      return NextResponse.json({ error: "Unauthorized wallet" }, { status: 403 });
    }

    await dbConnect();
    const nonce = crypto.randomBytes(32).toString("hex");

    await Nonce.create({
      nonce,
      walletAddress: address.toLowerCase(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      used: false,
    });

    return NextResponse.json({ nonce });
  } catch (error: any) {
    console.error("Nonce generation failed:", error.message);
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
