import { Router, Request, Response } from "express";
import dbConnect from "../lib/db";
import { FrontendError } from "../lib/models/frontendError.model";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const body = req.body;

    const {
      message,
      stack,
      userAddress,
      path,
      action,
      platform,
      additionalData,
    } = body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const errorEntry = new FrontendError({
      message,
      stack,
      userAddress,
      path,
      action,
      platform: platform || "others",
      status: "new",
      additionalData,
    });

    await errorEntry.save();

    res.json({ success: true, id: errorEntry._id });
  } catch (error: any) {
    console.error("Failed to save frontend error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
