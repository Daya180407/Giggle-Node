import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_MAX_AGE_SECONDS, createSessionToken, readSessionToken, verifyPassword } from "./crypto";
import { refreshDb } from "./store";
import { normalizeUsername } from "./owners";
import type { DB, OwnerAccount } from "./types";

/**
 * Owner sessions are deliberately separate from site sessions:
 * - their own cookie, scoped to /owner so public pages never receive it
 * - the signed subject carries the owner id + sessionVersion, so a ban or a
 *   password reset invalidates every open session
 */
export const OWNER_COOKIE = "gn_owner_session";
export const OWNER_COOKIE_PATH = "/owner";

function ownerSubject(owner: OwnerAccount): string {
  return `own:${owner.id}~${owner.sessionVersion ?? 0}`;
}

function parseSubject(value: string): { id: string; version: number } | null {
  if (!value.startsWith("own:")) return null;
  const [id, version] = value.slice(4).split("~");
  if (!id) return null;
  return { id, version: Number(version) || 0 };
}

export async function getCurrentOwner(): Promise<OwnerAccount | null> {
  const store = await cookies();
  const subject = await readSessionToken(store.get(OWNER_COOKIE)?.value);
  const parsed = subject ? parseSubject(subject) : null;
  if (!parsed) return null;

  const db = await refreshDb(2000);
  const owner = (db.ownerAccounts ?? []).find((row) => row.id === parsed.id);
  if (!owner) return null;
  if (owner.status !== "active") return null;
  if ((owner.sessionVersion ?? 0) !== parsed.version) return null;
  return owner;
}

export async function requireOwner(): Promise<OwnerAccount> {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");
  return owner;
}

export async function startOwnerSession(owner: OwnerAccount): Promise<void> {
  const headerList = await headers();
  const store = await cookies();
  store.set(OWNER_COOKIE, await createSessionToken(ownerSubject(owner)), {
    httpOnly: true,
    sameSite: "lax",
    path: OWNER_COOKIE_PATH,
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: headerList.get("x-forwarded-proto") === "https",
  });
}

export async function clearOwnerSession(): Promise<void> {
  const store = await cookies();
  store.set(OWNER_COOKIE, "", { httpOnly: true, sameSite: "lax", path: OWNER_COOKIE_PATH, maxAge: 0 });
}

const DUMMY_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function verifyOwnerCredentials(
  db: DB,
  username: string,
  password: string,
): Promise<OwnerAccount | null> {
  const wanted = normalizeUsername(username);
  const owner = (db.ownerAccounts ?? []).find((row) => row.username === wanted);
  if (!owner) {
    // Constant-ish work so a missing username is not detectable by timing.
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  if (owner.status !== "active") return null;
  const valid = await verifyPassword(password, owner.passwordHash);
  return valid ? owner : null;
}
