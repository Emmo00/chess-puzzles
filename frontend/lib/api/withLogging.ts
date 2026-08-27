import type { NextRequest, NextResponse } from "next/server";
import { createRequestLogger, getRequestId, maskAddress, type Logger } from "@/lib/logger";

export type RouteHandler = (
  request: NextRequest,
  logger: Logger,
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with request lifecycle logging: start, authenticated
 * user, completion (status + duration), and errors (message + stack).
 *
 * Usage:
 *   export async function POST(request: NextRequest, { params }: ...) {
 *     return withLogging('/api/hints/consume', request, async (req, log) => { ... });
 *   }
 * or wrap via runRequest.
 */
export async function runRequest(
  request: NextRequest,
  endpoint: string,
  handler: (request: NextRequest, logger: Logger) => Promise<NextResponse>,
): Promise<NextResponse> {
  const log = createRequestLogger(request, endpoint);
  const startedAt = Date.now();

  log.info("request.start");

  try {
    const response = await handler(request, log);
    const durationMs = Date.now() - startedAt;
    log.info("request.complete", { statusCode: response.status, durationMs });

    // Propagate correlation id so the client can trace the request.
    response.headers.set("x-request-id", getRequestId(request));
    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const err = error instanceof Error ? error : new Error(String(error));
    log.error("request.failed", err, {
      statusCode: (error as { status?: number } | null)?.status ?? 500,
      durationMs,
    });
    throw error;
  }
}

/** Convenience wrapper that preserves a hand-authored handler signature. */
export function withLogging(
  endpoint: string,
  handler: (request: NextRequest, logger: Logger) => Promise<NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) => runRequest(request, endpoint, handler);
}

export { createRequestLogger, getRequestId, maskAddress };
export type { Logger } from "@/lib/logger";