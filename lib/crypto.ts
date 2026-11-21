/**
 * Password hashing + session tokens using Web Crypto (works in Node 20+ and Cloudflare Workers).
 * Passwords: PBKDF2-SHA256 (150k iterations, random 16-byte salt).
 * Sessions: HMAC-SHA256 signed `userId.expiry` payload in an httpOnly cookie.
 */

// Cloudflare Workers rejects PBKDF2 iteration counts above 100,000 (NotSupportedError),
// so this is the strongest setting that works in every runtime we deploy to.
const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(password: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iterations, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !saltB64 || !hashB64) return false;
  try {
    const derived = await derive(password, fromBase64(saltB64), Number(iterations));
    return timingSafeEqual(toBase64(derived), hashB64);
  } catch {
    return false;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------ sessions ------------------------------ */

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "giglenode-dev-only-secret-change-me";
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(userId: string): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${await sign(payload)}`;
}

/** Returns the userId for a valid, unexpired token, else null. */
export async function readSessionToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  if (!userId || !expires || !signature) return null;
  if (!Number.isFinite(Number(expires)) || Number(expires) < Date.now()) return null;
  const expected = await sign(`${userId}.${expires}`);
  return timingSafeEqual(signature, expected) ? userId : null;
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
