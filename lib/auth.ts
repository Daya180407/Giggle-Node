import { cookies, headers } from "next/headers";
import { SESSION_MAX_AGE_SECONDS, createSessionToken, readSessionToken, verifyPassword } from "./crypto";
import { readDb, refreshDb } from "./store";
import type { DB, User } from "./types";

export const SESSION_COOKIE = "gn_session";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Verified against the HMAC signature, so a forged user id cookie is rejected. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  // Bounded freshness: a user created on another isolate must be visible here quickly.
  const db = await refreshDb(2000);
  const user = db.users.find((u) => u.id === userId) ?? null;
  return user && !user.banned ? user : null;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function startSession(userId: string): Promise<void> {
  const headerList = await headers();
  const proton = headerList.get("x-forwarded-proto");
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: proton === "https",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "127.0.0.1";
}

export async function verifyCredentials(db: DB, email: string, password: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    // Constant-ish work for unknown accounts, so timing does not reveal existence.
    await verifyPassword(password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    return null;
  }
  if (user.banned) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}
