import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import { BugReport } from "@/lib/models/bugReport.model";
import { getClientIp } from "@/lib/security/requestProtection";
import { enforceRateLimitOrResponse } from "@/lib/security/rateLimitResponse";

const REPORT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 100_000;

const generateReportId = (): string => randomBytes(6).toString("hex");

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const rateLimitResponse = enforceRateLimitOrResponse({
      endpoint: "telegram.reports",
      rules: [
        { scopeSuffix: "ip", key: clientIp, maxRequests: 20, windowMs: 60_000 },
      ],
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Report payload is required" },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    if (typeof payload.action !== "string" && typeof payload.message !== "string") {
      return NextResponse.json(
        { message: "Report must include an action or message" },
        { status: 400 }
      );
    }

    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { message: "Report payload is too large" },
        { status: 413 }
      );
    }

    await dbConnect();

    const reportId = generateReportId();
    const expiresAt = new Date(Date.now() + REPORT_TTL_MS);

    await BugReport.create({
      reportId,
      payload,
      expiresAt,
    });

    return NextResponse.json({ success: true, reportId, expiresAt });
  } catch (error: any) {
    console.error("Failed to create bug report:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
