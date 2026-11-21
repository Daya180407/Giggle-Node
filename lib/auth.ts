import { cookies, headers } from "next/headers";
import type { DB, User } from "./types";

export const SESSION_COOKIE = "gn_session";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const { readDb } = await import("./store");
  return readDb().users.find((u) => u.id === id) ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function requestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "127.0.0.1";
}

export function findOrCreateUser(db: DB, email: string, name?: string): User {
  const normalized = email.trim().toLowerCase();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (existing) return existing;
  const fallbackName = name?.trim() || normalized.split("@")[0].replace(/[._-]+/g, " ");
  const user: User = {
    id: `u_${Date.now().toString(36)}`,
    name: fallbackName.replace(/\b\w/g, (c) => c.toUpperCase()),
    email: normalized,
    avatar: fallbackName.slice(0, 1).toUpperCase(),
    role: "user",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  return user;
}
