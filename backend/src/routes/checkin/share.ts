import { Router, Request, Response } from "express";
import { dbConnect } from "@workspace/db";
import { getDailyChallengeShareData } from "../../lib/services/daily-challenge-share.service";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const d = (req.query.d as string) || (req.query.day as string) || "";

    await dbConnect();

    const { getUtcDayNumber } = await import("../../lib/utils/time");

    let utcDay: number;
    const trimmed = d.trim();
    if (/^\d+$/.test(trimmed)) {
      utcDay = Number(trimmed);
    } else if (trimmed) {
      const asDate = new Date(trimmed);
      utcDay = Number.isNaN(asDate.getTime()) ? getUtcDayNumber() : getUtcDayNumber(asDate);
    } else {
      utcDay = getUtcDayNumber();
    }

    const shareData = await getDailyChallengeShareData(utcDay);

    if (!shareData) {
      res.status(404).json({ message: "Daily challenge not found" });
      return;
    }

    res.json(shareData);
  } catch (error: any) {
    console.error("Error fetching share data:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch share data",
    });
  }
});

export default router;
