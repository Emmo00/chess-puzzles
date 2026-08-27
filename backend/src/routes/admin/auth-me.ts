import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";

const router = Router();

router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const session = req.adminSession!;
    res.json({ authenticated: true, address: session.address, role: session.role });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
