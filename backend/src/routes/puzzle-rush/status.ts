import { Router, Request, Response } from "express";
import dbConnect from "../../lib/db";
import PuzzleRushService from "../../lib/services/puzzleRush.service";

const router: Router = Router();

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

router.get("/", async (req: Request, res: Response) => {
  try {
    let walletAddress: string | undefined;
    const queryWallet = req.query.walletAddress as string;
    if (queryWallet && ADDRESS_REGEX.test(queryWallet)) {
      walletAddress = queryWallet.toLowerCase();
    }

    if (!walletAddress) {
      const authHeader =
        (req.headers["x-wallet-address"] as string) ||
        req.headers.authorization?.replace("Bearer ", "") ||
        (req.query.walletAddress as string);

      if (authHeader && ADDRESS_REGEX.test(authHeader)) {
        walletAddress = authHeader.toLowerCase();
      }
    }

    await dbConnect();
    const service = new PuzzleRushService();
    const status = await service.getStatus(walletAddress);
    res.json(status);
  } catch (error: any) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch Puzzle Rush status" });
  }
});

export default router;
