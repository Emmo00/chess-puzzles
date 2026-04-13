import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { FarcasterNotificationToken } from "@/lib/models/farcasterNotificationToken.model";

type JsonFarcasterSignature = {
  header: string;
  payload: string;
  signature: string;
};

type FarcasterEventPayload = {
  event?: string;
  notificationDetails?: {
    url?: string;
    token?: string;
  };
};

const decodeBase64UrlToJson = (value: string): Record<string, unknown> | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (normalized.length % 4)) % 4;
    const padded = normalized.padEnd(normalized.length + padding, "=");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isSignedEnvelope = (body: unknown): body is JsonFarcasterSignature => {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.header === "string" &&
    typeof candidate.payload === "string" &&
    typeof candidate.signature === "string"
  );
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    let envelope: JsonFarcasterSignature | null = null;
    let eventPayload: FarcasterEventPayload | null = null;
    let headerPayload: Record<string, unknown> | null = null;

    if (isSignedEnvelope(body)) {
      envelope = body;
      headerPayload = decodeBase64UrlToJson(body.header);
      eventPayload = decodeBase64UrlToJson(body.payload) as FarcasterEventPayload | null;
    } else if (body && typeof body === "object") {
      eventPayload = body as FarcasterEventPayload;
    }

    if (!eventPayload?.event) {
      return NextResponse.json(
        { ok: false, error: "Missing event payload" },
        { status: 400 }
      );
    }

    const event = eventPayload.event;
    const notificationToken = eventPayload.notificationDetails?.token;
    const notificationUrl = eventPayload.notificationDetails?.url;
    const fid =
      typeof headerPayload?.fid === "number"
        ? headerPayload.fid
        : undefined;

    if (notificationToken) {
      await FarcasterNotificationToken.findOneAndUpdate(
        { token: notificationToken },
        {
          token: notificationToken,
          notificationUrl,
          fid,
          lastEvent: event,
          enabled: event !== "miniapp_removed" && event !== "notifications_disabled",
          lastPayload: eventPayload as Record<string, unknown>,
          jfsHeader: envelope?.header,
          jfsPayload: envelope?.payload,
          jfsSignature: envelope?.signature,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } else if (fid && (event === "miniapp_removed" || event === "notifications_disabled")) {
      await FarcasterNotificationToken.updateMany(
        { fid, enabled: true },
        {
          $set: {
            enabled: false,
            lastEvent: event,
            lastPayload: eventPayload as Record<string, unknown>,
            jfsHeader: envelope?.header,
            jfsPayload: envelope?.payload,
            jfsSignature: envelope?.signature,
          },
        }
      );
    }

    return NextResponse.json({
      ok: true,
      storedToken: Boolean(notificationToken),
      event,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid webhook payload" }, { status: 400 });
  }
}
