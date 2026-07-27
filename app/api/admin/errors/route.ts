import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { FrontendError } from "@/lib/models/frontendError.model";
import { withAdminAuth } from "@/lib/admin/middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const status = searchParams.get("status");

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

  return NextResponse.json({
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

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();
  const body = await request.json();

  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
  }

  if (status !== "new" && status !== "resolved") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updatedError = await FrontendError.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!updatedError) {
    return NextResponse.json({ error: "Error not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updatedError });
});
