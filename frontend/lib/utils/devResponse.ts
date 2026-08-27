import { isDevMode } from "@/lib/config/devMode";

const toJsonSafe = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Error) {
    const err = value as Error & { cause?: unknown };
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
    };
  }
  try {
    return JSON.parse(
      JSON.stringify(value, (_, v) =>
        typeof v === "bigint" ? `${v}n` : v
      )
    );
  } catch {
    return String(value);
  }
};

/**
 * Attaches the raw transaction request payload onto an error for later
 * surfacing by devErrorBody(). Non-enumerable so it does not pollute the
 * error's own shape.
 */
export function attachDevPayload(
  error: unknown,
  payload: unknown
): void {
  if (!isDevMode) return;
  try {
    Object.defineProperty(error, "devPayload", {
      value: payload,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch {
    // ignore - best effort only
  }
}

/**
 * Builds the `dev` field for an error JSON response. Returns an empty object
 * when dev mode is off, so production responses are unchanged.
 */
export function devErrorBody(
  error: unknown,
  payload?: unknown
): Record<string, unknown> {
  if (!isDevMode) return {};

  const devPayload = (error as { devPayload?: unknown } | null)?.devPayload;
  const devPayloadObj =
    devPayload && typeof devPayload === "object"
      ? (devPayload as Record<string, unknown>)
      : undefined;

  const errorObj =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...devPayloadObj,
        }
      : error;

  return {
    dev: {
      error: toJsonSafe(errorObj),
      payload: payload === undefined ? undefined : toJsonSafe(payload),
    },
  };
}