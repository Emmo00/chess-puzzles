import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
      adminSession?: { address: string; role: "admin" };
    }
  }
}

export function authenticateWallet(req: Request, res: Response, next: NextFunction): void {
  const address =
    (req.headers["x-wallet-address"] as string) ||
    req.headers.authorization?.replace("Bearer ", "") ||
    (req.query.walletAddress as string);

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(401).json({ error: "Missing or invalid wallet address" });
    return;
  }

  req.walletAddress = address.toLowerCase();
  next();
}
