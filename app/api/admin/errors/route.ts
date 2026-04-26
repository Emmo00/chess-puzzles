import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { FrontendError } from "@/lib/models/frontendError.model";

const verifyAdminAccess = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const expectedKey = process.env.NEXT_PUBLIC_ADMIN_PAGE_KEY;

  if (!expectedKey) {
    // If no key is set, allow access
    return true;
  }

  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return false;
  }

  return true;
};

export async function GET(req: Request) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(req.url);
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
  } catch (error: any) {
    console.error("Failed to fetch frontend errors:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

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
  } catch (error: any) {
    console.error("Failed to update frontend error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
