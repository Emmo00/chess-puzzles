import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { getRedisClient } from "../config/redis";

type RateLimitConfig = {
  key: string;
  points: number;
  duration: number;
};

function createLimiter(points: number, duration: number): RateLimiterRedis {
  return new RateLimiterRedis({
    storeClient: getRedisClient(),
    keyPrefix: "rl",
    points,
    duration,
  });
}

// Pre-configured limiters
const limiters = {
  "checkin.status": createLimiter(90, 60),
  "checkin.reserve": createLimiter(20, 60),
  "checkin.solve": createLimiter(30, 60),
  "checkin.claim.payload": createLimiter(20, 60),
  "checkin.claim.confirm": createLimiter(20, 60),
  "puzzle-rush.status": createLimiter(60, 60),
  "puzzle-rush.session.start": createLimiter(20, 60),
  "puzzle-rush.session.end": createLimiter(20, 60),
  "puzzle-rush.session.result": createLimiter(240, 60),
  "puzzle-rush.puzzles": createLimiter(120, 60),
  "puzzle-rush.leaderboard": createLimiter(60, 60),
  "admin.puzzle-rush-config.read": createLimiter(60, 60),
  "admin.puzzle-rush-config.update": createLimiter(30, 60),
  default: createLimiter(100, 60),
};

export function rateLimit(limiterKey: string) {
  const limiter = limiters[limiterKey as keyof typeof limiters] || limiters.default;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const wallet = req.walletAddress || "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const fingerprint = req.headers["x-device-fingerprint"] as string || "";

    // Build composite key
    const keys = [wallet, ip, fingerprint].filter(Boolean);

    try {
      for (const k of keys) {
        const result = await limiter.consume(`${limiterKey}:${k}`);
        res.setHeader(`X-RateLimit-Remaining-${k.slice(0, 8)}`, result.remainingPoints);
      }
      next();
    } catch (rejRes: any) {
      const retryAfterSeconds = Math.ceil((rejRes.msBeforeNext || 60000) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds,
      });
    }
  };
}

// For backward compatibility: get IP from request
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    return (forwardedFor as string).split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return (realIp as string).trim();
  }
  return req.ip || "unknown";
}

// Device fingerprint extraction
export function getDeviceFingerprint(req: Request): string | null {
  const fromHeader = req.headers["x-device-fingerprint"] as string;
  if (fromHeader && /^[a-z0-9:_-]{16,128}$/.test(fromHeader.trim().toLowerCase())) {
    return fromHeader.trim().toLowerCase();
  }
  return null;
}
