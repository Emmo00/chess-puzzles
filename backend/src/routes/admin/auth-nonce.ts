import { Router, Request, Response } from "express";
import crypto from "crypto";
import dbConnect from "../../lib/db";
import nonceModel from "../../lib/models/nonce.model";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { address } = req.body;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!adminWallet) {
      res.status(500).json({ error: "Admin wallet not configured on server" });
      return;
    }

    if (address.toLowerCase() !== adminWallet) {
      res.status(403).json({ error: "Unauthorized wallet" });
      return;
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

    res.json({ nonce });
  } catch (error: any) {
    console.error("Nonce generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

export default router;
