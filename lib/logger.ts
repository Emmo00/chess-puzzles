import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  endpoint?: string;
  method?: string;
  walletAddress?: string;
  userId?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL as string | undefined;
  if (raw && raw.toLowerCase() in LEVEL_ORDER) {
    return raw.toLowerCase() as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function maskAddress(address?: string): string {
  if (!address) return "unknown";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Redacts known-sensitive fields from a context object before logging. */
function scrubContext(context: LogContext): Record<string, unknown> {
  const sensitiveKeys = [
    "privateKey",
    "signature",
    "token",
    "secret",
    "password",
    "authorization",
    "auth",
    "cookie",
    "apiKey",
    "api_key",
    "private",
  ];

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "walletaddress") {
      out[key] = maskAddress(value as string);
      continue;
    }
    const isSensitive =
      sensitiveKeys.some((s) => lowerKey.includes(s)) &&
      (typeof value === "string" || value === undefined);
    if (isSensitive) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (key === "error" && value instanceof Error) {
      out[key] = serializeError(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function serializeError(error: Error): Record<string, unknown> {
  const err = error as Error & { devPayload?: unknown };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err.devPayload !== undefined ? { devPayload: err.devPayload } : {}),
  };
}

function write(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[getConfiguredLevel()]) return;

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: level.toUpperCase(),
    msg: message,
  };

  if (context && Object.keys(context).length > 0) {
    Object.assign(entry, scrubContext(context));
  }

  if (error) {
    entry.error = serializeError(error);
  }

  const line = JSON.stringify(entry);
  // Base console call surfaces JSON to stdout/stderr exactly as logged.
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else if (level === "debug") {
    console.debug(line);
  } else {
    console.log(line);
  }
}

export const logger: Logger = {
  debug: (message, context) => write("debug", message, undefined, context),
  info: (message, context) => write("info", message, undefined, context),
  warn: (message, context) => write("warn", message, undefined, context),
  error: (message, error, context) => write("error", message, error, context),
};

/**
 * Extracts (or generates) a correlation/request ID for the given request and
 * returns a logger pre-bound with request-level context.
 */
export function createRequestLogger(request: NextRequest, endpoint: string): Logger {
  const requestId = request.headers.get("x-request-id") || randomUUID();

  const base: LogContext = {
    requestId,
    endpoint,
    method: request.method,
  };

  return {
    debug: (message, context) =>
      write("debug", message, undefined, { ...base, ...context }),
    info: (message, context) =>
      write("info", message, undefined, { ...base, ...context }),
    warn: (message, context) =>
      write("warn", message, undefined, { ...base, ...context }),
    error: (message, error, context) =>
      write("error", message, error, { ...base, ...context }),
  };
}

export const getRequestId = (request: NextRequest): string =>
  request.headers.get("x-request-id") || randomUUID();