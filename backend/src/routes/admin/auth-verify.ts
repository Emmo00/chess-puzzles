import { Router, Request, Response } from "express";
import { recoverMessageAddress } from "viem";
import dbConnect from "../../lib/db";
import nonceModel from "../../lib/models/nonce.model";
import { signSession } from "../../lib/admin/jwt";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { address, signature, nonce } = req.body;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !signature || !nonce) {
      res.status(400).json({ error: "Missing or invalid fields" });
      return;
    }

    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!adminWallet) {
      res.status(500).json({ error: "Admin wallet not configured" });
      return;
    }

    await dbConnect();

    const doc = await nonceModel.findOne({ nonce }).lean();
    if (!doc) {
      res.status(401).json({ error: "Unknown nonce" });
      return;
    }

    if (doc.used) {
      res.status(401).json({ error: "Nonce already used" });
      return;
    }

    if (new Date() > doc.expiresAt) {
      res.status(401).json({ error: "Nonce expired" });
      return;
    }

    if (doc.walletAddress !== address.toLowerCase()) {
      res.status(401).json({ error: "Nonce does not match address" });
      return;
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
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }

    if (recovered.toLowerCase() !== address.toLowerCase() || recovered.toLowerCase() !== adminWallet) {
      await nonceModel.updateOne({ nonce }, { $set: { used: true } });
      console.error(`Admin auth failed: recovered=${recovered}, address=${address}, admin=${adminWallet}`);
      res.status(401).json({ error: "Signature does not match admin wallet" });
      return;
    }

    await nonceModel.updateOne({ nonce }, { $set: { used: true } });

    const token = await signSession({ address: adminWallet, role: "admin" });

    res.cookie("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin verify failed:", error.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
