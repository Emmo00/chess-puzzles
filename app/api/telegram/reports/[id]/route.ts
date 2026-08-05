import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import { BugReport } from "@/lib/models/bugReport.model";

const REPORT_ACCESS_KEY = process.env.REPORT_ACCESS_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessKey = request.headers.get("x-report-access-key");
    if (!REPORT_ACCESS_KEY || accessKey !== REPORT_ACCESS_KEY) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !/^[a-f0-9]{12}$/.test(id)) {
      return NextResponse.json({ message: "Invalid report id" }, { status: 400 });
    }

    await dbConnect();

    const report = await BugReport.findOne({
      reportId: id,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!report) {
      return NextResponse.json(
        { message: "Report not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, report: report.payload });
  } catch (error: any) {
    console.error("Failed to fetch bug report:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
