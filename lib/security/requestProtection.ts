import { createHash } from "crypto";
import { NextRequest } from "next/server";

const DEVICE_FINGERPRINT_HEADER = "x-device-fingerprint";
const DEVICE_FINGERPRINT_REGEX = /^[a-z0-9:_-]{16,128}$/;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
  scope: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __chessRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  global.__chessRateLimitStore || new Map<string, RateLimitEntry>();
if (!global.__chessRateLimitStore) {
  global.__chessRateLimitStore = rateLimitStore;
}

const pruneExpiredRateLimits = () => {
  const now = Date.now();

  rateLimitStore.forEach((value, key) => {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
};

const normalizeFingerprint = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!DEVICE_FINGERPRINT_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
};

export const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
};

export const getDeviceFingerprintFromRequest = (request: NextRequest) => {
  const fromHeader = normalizeFingerprint(
    request.headers.get(DEVICE_FINGERPRINT_HEADER)
  );
  if (fromHeader) {
    return fromHeader;
  }

  // Fallback keeps legacy clients functional while still producing a stable key.
  const fallbackSource = [
    getClientIp(request),
    request.headers.get("user-agent") || "",
    request.headers.get("accept-language") || "",
    request.headers.get("sec-ch-ua-platform") || "",
  ].join("|");

  const hash = createHash("sha256").update(fallbackSource).digest("hex");
  return `srv-${hash.slice(0, 48)}`;
};

export const applyRateLimit = ({
  scope,
  key,
  maxRequests,
  windowMs,
}: RateLimitOptions): RateLimitResult => {
  if (rateLimitStore.size > 25_000) {
    pruneExpiredRateLimits();
  }

  const now = Date.now();
  const bucketKey = `${scope}:${key}`;
  const existing = rateLimitStore.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(bucketKey, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: 0,
      resetAt,
      scope,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt: existing.resetAt,
      scope,
    };
  }

  existing.count += 1;
  rateLimitStore.set(bucketKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: 0,
    resetAt: existing.resetAt,
    scope,
  };
};

export const isRateLimitExceeded = (
  limits: RateLimitResult[]
): RateLimitResult | null => {
  for (const limit of limits) {
    if (!limit.allowed) {
      return limit;
    }
  }

  return null;
};

export const DEVICE_FINGERPRINT_REQUEST_HEADER = DEVICE_FINGERPRINT_HEADER;
