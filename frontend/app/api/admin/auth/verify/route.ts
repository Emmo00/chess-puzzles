import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import dbConnect from "../../../../../lib/db";
import nonceModel from "../../../../../lib/models/nonce.model";
import { signSession } from "../../../../../lib/admin/jwt";

export async function POST(request: NextRequest) {
  try {
    const { address, signature, nonce } = await request.json();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !signature || !nonce) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!adminWallet) {
      return NextResponse.json({ error: "Admin wallet not configured" }, { status: 500 });
    }

    await dbConnect();

    const doc = await nonceModel.findOne({ nonce }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Unknown nonce" }, { status: 401 });
    }

    if (doc.used) {
      return NextResponse.json({ error: "Nonce already used" }, { status: 401 });
    }

    if (new Date() > doc.expiresAt) {
      return NextResponse.json({ error: "Nonce expired" }, { status: 401 });
    }

    if (doc.walletAddress !== address.toLowerCase()) {
      return NextResponse.json({ error: "Nonce does not match address" }, { status: 401 });
    }

    const message = [
      "ChessPuzzles Admin Login",
      "",
      "Wallet:",
      address,
      "",
      "Nonce:",
      nonce,
      "",
      "This request expires in 5 minutes.",
    ].join("\n");

    let recovered: string;
    try {
      recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    } catch {
      await nonceModel.updateOne({ nonce }, { $set: { used: true } });
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    if (recovered.toLowerCase() !== address.toLowerCase() || recovered.toLowerCase() !== adminWallet) {
      await nonceModel.updateOne({ nonce }, { $set: { used: true } });
      console.error(`Admin auth failed: recovered=${recovered}, address=${address}, admin=${adminWallet}`);
      return NextResponse.json({ error: "Signature does not match admin wallet" }, { status: 401 });
    }

    await nonceModel.updateOne({ nonce }, { $set: { used: true } });

    const token = await signSession({ address: adminWallet, role: "admin" });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch (error: any) {
    console.error("Admin verify failed:", error.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
