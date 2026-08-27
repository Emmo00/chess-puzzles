import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import dbConnect from "../../lib/db";
import { FrontendError } from "../../lib/models/frontendError.model";

const router = Router();

router.get("/", requireAdmin, async (req: Request, res: Response) => {
  await dbConnect();

  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const status = req.query.status as string | undefined;

  const query: any = {};
  if (status && (status === "new" || status === "resolved")) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [errors, total] = await Promise.all([
    FrontendError.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FrontendError.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  await dbConnect();
  const body = req.body;

  const { id, status } = body;

  if (!id || !status) {
    res.status(400).json({ error: "ID and status are required" });
    return;
  }

  if (status !== "new" && status !== "resolved") {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const updatedError = await FrontendError.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: "after" }
  );

  if (!updatedError) {
    res.status(404).json({ error: "Error not found" });
    return;
  }

  res.json({ success: true, data: updatedError });
});

export default router;
