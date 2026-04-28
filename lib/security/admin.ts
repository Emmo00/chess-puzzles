import { NextRequest } from "next/server";

export function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.error("ADMIN_API_KEY is not set in environment variables");
    return false;
  }

  const providedKey = request.headers.get("x-admin-key") || request.nextUrl.searchParams.get("adminKey");
  return providedKey === adminKey;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
