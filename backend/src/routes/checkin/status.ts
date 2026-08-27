import { Router, Request, Response } from "express";

import dbConnect from "../../lib/db";
import CheckInService from "../../lib/services/checkin.service";
import { authenticateWallet } from "../../middleware/auth";

const router: Router = Router();

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

router.get("/", async (req: Request, res: Response) => {
  try {
    const checkInService = new CheckInService();
    let walletAddress: string | undefined;

    const queryWallet = req.query.walletAddress as string | undefined;
    if (queryWallet && ADDRESS_REGEX.test(queryWallet)) {
      walletAddress = queryWallet.toLowerCase();
    }

    if (!walletAddress) {
      // Try optional auth - if no valid auth, walletAddress stays undefined
      const address =
        (req.headers["x-wallet-address"] as string) ||
        req.headers.authorization?.replace("Bearer ", "") ||
        (req.query.walletAddress as string);

      if (address && ADDRESS_REGEX.test(address)) {
        walletAddress = address.toLowerCase();
      }
    }

    await dbConnect();

    const status = await checkInService.getDailyStatus(walletAddress);

    res.json(status);
  } catch (error: any) {
    console.error("Error fetching check-in status:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch check-in status",
    });
  }
});

export default router;
