import { NextRequest, NextResponse } from "next/server";
import { verifySession, type AdminSession } from "./jwt";

export async function requireAdmin(request: NextRequest): Promise<AdminSession> {
  const token = request.cookies.get("admin_session")?.value;
  if (!token) {
    throw new UnauthorizedError("No session");
  }

  const session = await verifySession(token);
  if (!session) {
    throw new UnauthorizedError("Invalid or expired session");
  }

  const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
  if (!adminWallet) {
    throw new UnauthorizedError("Admin wallet not configured");
  }

  if (session.address.toLowerCase() !== adminWallet || session.role !== "admin") {
    throw new UnauthorizedError("Not authorized");
  }

  return session;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Wraps an API route handler with admin auth. If auth fails, returns 401 immediately.
 */
export function withAdminAuth(
  handler: (request: NextRequest, session: AdminSession) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    try {
      const session = await requireAdmin(request);
      return handler(request, session);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return unauthorizedResponse(err.message);
      }
      console.error("Admin auth error:", err);
      return unauthorizedResponse();
    }
  };
}
