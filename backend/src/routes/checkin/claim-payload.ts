import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

import dbConnect from "../../lib/db";
import CheckInService from "../../lib/services/checkin.service";
import { authenticateWallet } from "../../middleware/auth";
import { devErrorBody } from "../../lib/utils/devResponse";

const router: Router = Router();

const maskAddress = (address?: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const requestId = (req.headers["x-claim-debug-id"] as string) || randomUUID();

  try {
    console.info("[ClaimFlow][API][payload] start", { requestId });

    await dbConnect();

    console.info("[ClaimFlow][API][payload] authenticated", {
      requestId,
      wallet: maskAddress(req.walletAddress),
    });

    const checkInService = new CheckInService();

    const deviceFingerprint = (req.headers["x-device-fingerprint"] as string) || undefined;

    const claim = await checkInService.getFreshClaimPayload(
      req.walletAddress!,
      deviceFingerprint
    );

    console.info("[ClaimFlow][API][payload] generated", {
      requestId,
      wallet: maskAddress(req.walletAddress),
      day: claim.day,
      deadline: claim.deadline,
      nonce: claim.nonce,
      signatureLength: claim.signature.length,
      secondsUntilExpiry: claim.deadline - Math.floor(Date.now() / 1000),
    });

    res.json({
      success: true,
      claim,
    });
  } catch (error: any) {
    console.error("[ClaimFlow][API][payload] error", {
      requestId,
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    res.status(error.status || 500).json({
      message: error.message || "Failed to create check-in claim payload",
      ...devErrorBody(error),
    });
  }
});

export default router;
