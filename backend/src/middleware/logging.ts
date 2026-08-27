import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface Logger {
  info(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

const SENSITIVE_KEYS = new Set([
  "privateKey", "signature", "token", "password", "secret",
  "authorization", "x-wallet-address", "x-device-fingerprint",
]);

function redactSensitive(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 100) {
      result[key] = value.slice(0, 50) + "..." + value.slice(-10);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function maskAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function createLogger(context?: Record<string, any>): Logger {
  const ctx = context ? redactSensitive(context) : {};
  return {
    info: (message, extra) =>
      console.log(JSON.stringify({ level: "info", message, ...ctx, ...extra })),
    error: (message, error, extra) =>
      console.error(JSON.stringify({ level: "error", message, error: error?.message, stack: error?.stack, ...ctx, ...extra })),
    warn: (message, extra) =>
      console.warn(JSON.stringify({ level: "warn", message, ...ctx, ...extra })),
    debug: (message, extra) =>
      console.debug(JSON.stringify({ level: "debug", message, ...ctx, ...extra })),
  };
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  const endpoint = `${req.method} ${req.path}`;
  const startedAt = Date.now();

  const log = createLogger({ requestId, endpoint });
  (req as any).log = log;
  (req as any).requestId = requestId;

  log.info("request.start");

  res.setHeader("x-request-id", requestId);

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const durationMs = Date.now() - startedAt;
    log.info("request.complete", { statusCode: res.statusCode, durationMs });
    return originalJson(body);
  };

  next();
}

export function getRequestId(req: Request): string {
  return (req as any).requestId || "unknown";
}

export { createLogger };
