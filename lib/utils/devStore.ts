import { isDevMode } from "@/lib/config/devMode";
import { reportFrontendError } from "@/lib/utils/errorReporting";

export interface DevCapturedError {
  id: string;
  timestamp: string;
  message: string;
  action: string;
  source: "explicit" | "window" | "unhandledrejection" | "api";
  stack?: string;
  rawError?: unknown;
  rawPayload?: unknown;
}

type Subscriber = (errors: DevCapturedError[]) => void;

const MAX_CAPTURED = 50;

let captured: DevCapturedError[] = [];
const subscribers = new Set<Subscriber>();

export function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Error) {
    const err = value as Error & Record<string, unknown> & { cause?: unknown };
    return safeStringify({
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
      ...Object.fromEntries(
        Object.entries(err).filter(
          ([key]) => !["name", "message", "stack", "cause"].includes(key)
        )
      ),
    });
  }
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return String(value);

  const seen = new WeakSet();
  const serialize = (v: unknown, d: number): unknown => {
    if (v === null || v === undefined) return v;
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "function") return "[Function]";
    if (typeof v === "symbol") return String(v);
    if (v instanceof Error) {
      const err = v as Error & { cause?: unknown };
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
      };
    }
    if (typeof v === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
      if (Array.isArray(v)) return v.map((item) => serialize(item, d + 1));
      if (v instanceof Uint8Array) {
        return {
          bytes: Array.from(v),
          hex: Array.from(v)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        };
      }
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v)) {
        if (d >= 8 && typeof (v as Record<string, unknown>)[key] === "object") {
          out[key] = "[Nested]";
        } else {
          out[key] = serialize((v as Record<string, unknown>)[key], d + 1);
        }
      }
      return out;
    }
    return v;
  };

  try {
    return JSON.stringify(serialize(value, 0), null, 2);
  } catch {
    return String(value);
  }
}

export function subscribeDevErrors(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  subscriber(captured);
  return () => {
    subscribers.delete(subscriber);
  };
}

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber(captured);
  }
}

export function clearDevErrors(): void {
  captured = [];
  emit();
}

export interface CaptureDevErrorInput {
  message?: string;
  action: string;
  error?: unknown;
  payload?: unknown;
  source?: DevCapturedError["source"];
  report?: boolean;
}

export function captureDevError(input: CaptureDevErrorInput): void {
  const error = input.error;
  const errorMessage =
    input.message ||
    (error instanceof Error ? error.message : undefined) ||
    (typeof error === "string" ? error : undefined) ||
    "Unknown error";

  if (input.report !== false) {
    void reportFrontendError({
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      action: input.action,
      additionalData: input.payload,
    });
  }

  if (!isDevMode) return;

  const entry: DevCapturedError = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    message: errorMessage,
    action: input.action,
    source: input.source || "explicit",
    stack: error instanceof Error ? error.stack : undefined,
    rawError: error,
    rawPayload: input.payload,
  };

  captured = [...captured.slice(-(MAX_CAPTURED - 1)), entry];
  emit();
}

/**
 * Wraps an async operation, capturing the raw payload and raw error into the
 * dev overlay (and the standard error reporting pipeline) when they fail.
 * Re-throws the original error so existing error handling is untouched.
 */
export async function runWithDevCapture<T>(
  action: string,
  payload: unknown,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureDevError({ action, error, payload });
    throw error;
  }
}

/**
 * Surfaces the `dev` debug field (raw server error + payload) from an API
 * response into the dev overlay. No-op when dev mode is off or the response
 * carries no `dev` field.
 */
export function captureApiDevError(
  action: string,
  response: Response,
  json: unknown
): void {
  if (!isDevMode) return;
  const data = (json ?? {}) as { dev?: { error?: unknown; payload?: unknown } };
  if (!data.dev) return;
  captureDevError({
    action,
    message: (json as { message?: string })?.message || `API error (${response.status})`,
    error: data.dev.error,
    payload: data.dev.payload,
    source: "api",
  });
}
