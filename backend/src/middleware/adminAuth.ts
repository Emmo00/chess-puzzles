import { Request, Response, NextFunction } from "express";
import { verifySession, AdminSession } from "../lib/admin/jwt";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.cookies as any)?.admin_session;
    if (!token) {
      res.status(401).json({ error: "No session" });
      return;
    }

    const session = await verifySession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!adminWallet || session.address.toLowerCase() !== adminWallet || session.role !== "admin") {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    req.adminSession = session;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
