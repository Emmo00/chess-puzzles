import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { dbConnect } from "@workspace/db";
import { Nonce } from "@workspace/db";
import { signSession, isAdminWallet } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { address, signature, nonce } = await req.json();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !signature || !nonce) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    if (!isAdminWallet(address)) {
      return NextResponse.json({ error: "Unauthorized wallet" }, { status: 403 });
    }

    await dbConnect();

    const doc = await Nonce.findOne({ nonce }).lean();
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
      await Nonce.updateOne({ nonce }, { $set: { used: true } });
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    if (recovered.toLowerCase() !== address.toLowerCase() || !isAdminWallet(recovered)) {
      await Nonce.updateOne({ nonce }, { $set: { used: true } });
      return NextResponse.json({ error: "Signature does not match admin wallet" }, { status: 401 });
    }

    await Nonce.updateOne({ nonce }, { $set: { used: true } });

    const token = await signSession({ address: address.toLowerCase(), role: "admin" });

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
