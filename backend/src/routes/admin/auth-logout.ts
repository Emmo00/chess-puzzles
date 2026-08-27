import { Router, Request, Response } from "express";

const router: Router = Router();

router.post("/", async (_req: Request, res: Response) => {
  res.cookie("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.json({ success: true });
});

export default router;
