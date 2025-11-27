import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest } from "next/server";
import { QuickAuthUser } from "./types";

const client = createClient();

// Resolve information about the authenticated Farcaster user. In practice
// you might get this information from your database, Neynar, or Snapchain.
async function resolveUser(fid: number): Promise<QuickAuthUser> {
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`);

  if (response.ok) {
    const data = await response.json();
    const user = data.users?.[0];
    if (user) {
      return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
      };
    }
  }
  throw new Error("User not found");
}

export async function authenticateUser(request: NextRequest): Promise<QuickAuthUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }

  try {
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: process.env.HOSTNAME || "localhost:3000",
    });

    const user = await resolveUser(payload.sub);
    return user;
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      console.info("Invalid token:", e.message);
      throw new Error("Invalid token");
    }
    throw e;
  }
}