import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../../../lib/db";
import nonceModel from "../../../../../lib/models/nonce.model";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!adminWallet) {
      return NextResponse.json({ error: "Admin wallet not configured on server" }, { status: 500 });
    }

    if (address.toLowerCase() !== adminWallet) {
      return NextResponse.json({ error: "Unauthorized wallet" }, { status: 403 });
    }

    await dbConnect();
    const nonce = crypto.randomBytes(32).toString("hex");

    await nonceModel.create({
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
