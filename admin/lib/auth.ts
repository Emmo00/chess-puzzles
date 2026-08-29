export interface AdminSession {
  address: string;
  role: "admin";
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

async function createKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", enc as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(session: AdminSession, expiresInSec = 86400): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...session,
    iat: now,
    exp: now + expiresInSec,
  };

  const headerB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(header)) as unknown as ArrayBuffer);
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)) as unknown as ArrayBuffer);
  const message = `${headerB64}.${payloadB64}`;

  const key = await createKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message) as unknown as ArrayBuffer);
  const sigB64 = toBase64Url(sig);

  return `${message}.${sigB64}`;
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const key = await createKey(getSecret());
    const sigValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64) as unknown as ArrayBuffer,
      new TextEncoder().encode(message) as unknown as ArrayBuffer
    );
    if (!sigValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "admin") return null;

    return { address: payload.address, role: payload.role };
  } catch {
    return null;
  }
}

export function getAdminWallets(): string[] {
  const wallets = process.env.ADMIN_WALLETS;
  if (!wallets) return [];
  return wallets.split(",").map((w) => w.trim().toLowerCase());
}

export function isAdminWallet(address: string): boolean {
  const wallets = getAdminWallets();
  return wallets.includes(address.toLowerCase());
}
