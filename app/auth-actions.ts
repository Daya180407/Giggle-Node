"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearSession,
  normalizeEmail,
  requestIp,
  startSession,
  verifyCredentials,
} from "@/lib/auth";
import { hashPassword, randomToken, sha256Hex } from "@/lib/crypto";
import { flushPendingWrites, mutateDb, refreshDb, uid } from "@/lib/store";
import type { DB, User } from "@/lib/types";

export type AuthState = { ok: boolean; error?: string; message?: string; resetLink?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_REQUESTS = 3;
const RESET_TTL_MS = 60 * 60 * 1000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000;

/** Only same-origin relative paths, so `//evil.com` cannot be used as an open redirect. */
function safeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function pruneAuthEvents(db: DB) {
  const cutoff = Date.now() - EVENT_TTL_MS;
  db.authEvents = db.authEvents.filter((event) => +new Date(event.at) > cutoff);
}

function countEvents(db: DB, kind: "login" | "reset", ip: string, windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return db.authEvents.filter((e) => e.kind === kind && e.ip === ip && +new Date(e.at) > cutoff).length;
}

/* -------------------------------- login ------------------------------- */

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!EMAIL_RE.test(email) || password.length === 0) {
    return { ok: false, error: "Email aur password dono daaliye." };
  }

  const ip = await requestIp();
  // Another isolate may have created this account; verify against the latest document.
  const db = await refreshDb();
  if (countEvents(db, "login", ip, LOGIN_WINDOW_MS) >= LOGIN_MAX_ATTEMPTS) {
    return { ok: false, error: "Bahut zyada login attempts. 15 minute baad try kijiye." };
  }

  const user = await verifyCredentials(db, email, password);
  if (!user) {
    mutateDb((d) => {
      d.authEvents.push({ ip, at: new Date().toISOString(), kind: "login" });
      pruneAuthEvents(d);
    });
    return { ok: false, error: "Email ya password galat hai." };
  }

  await startSession(user.id);
  revalidatePath("/");
  redirect(next);
}

/* ------------------------------- signup ------------------------------- */

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/profile"));

  if (name.length < 2) return { ok: false, error: "Apna naam likhiye (2 letters se zyada)." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Valid email daaliye." };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password kam se kam ${MIN_PASSWORD} characters ka hona chahiye.` };
  }
  if (password !== confirm) return { ok: false, error: "Dono passwords match nahi kar rahe." };

  const db = await refreshDb();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: "Ye email pehle se registered hai. Login kijiye." };
  }

  const ip = await requestIp();
  const passwordHash = await hashPassword(password);
  // Built outside the mutator: a CAS replay must not create a second user with a new id
  // (the session cookie already points at this id).
  const created: User = {
    id: uid("u"),
    name,
    email,
    avatar: name.slice(0, 1).toUpperCase(),
    role: "user",
    createdAt: new Date().toISOString(),
    passwordHash,
  };
  const user = mutateDb((d) => {
    if (!d.users.some((u) => u.id === created.id || u.email.toLowerCase() === email)) {
      d.users.push(created);
    }
    d.authEvents.push({ ip, at: new Date().toISOString(), kind: "signup" });
    pruneAuthEvents(d);
    return created;
  });

  await flushPendingWrites();
  await startSession(user.id);
  revalidatePath("/");
  redirect(next);
}

/* --------------------------- forgot password --------------------------- */

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Valid email daaliye." };

  const ip = await requestIp();
  const db = await refreshDb();
  if (countEvents(db, "reset", ip, RESET_WINDOW_MS) >= RESET_MAX_REQUESTS) {
    return { ok: false, error: "Bahut zyada reset requests. Ek ghante baad try kijiye." };
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email);
  let resetLink: string | undefined;

  if (user) {
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
    mutateDb((d) => {
      const target = d.users.find((u) => u.id === user.id);
      if (target) {
        target.resetTokenHash = tokenHash;
        target.resetTokenExpiresAt = expiresAt;
      }
      d.authEvents.push({ ip, at: new Date().toISOString(), kind: "reset" });
      pruneAuthEvents(d);
    });
    await flushPendingWrites();
    resetLink = `/reset-password/${token}`;
  } else {
    mutateDb((d) => {
      d.authEvents.push({ ip, at: new Date().toISOString(), kind: "reset" });
      pruneAuthEvents(d);
    });
  }

  return {
    ok: true,
    message: "Agar ye email registered hai, to reset link generate ho gaya hai (1 ghante ke liye valid).",
    resetLink,
  };
}

/* ---------------------------- reset password --------------------------- */

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password kam se kam ${MIN_PASSWORD} characters ka hona chahiye.` };
  }
  if (password !== confirm) return { ok: false, error: "Dono passwords match nahi kar rahe." };

  const tokenHash = await sha256Hex(token);
  const user = (await refreshDb()).users.find(
    (u) => u.resetTokenHash === tokenHash && u.resetTokenExpiresAt && +new Date(u.resetTokenExpiresAt) > Date.now(),
  );
  if (!user) {
    return { ok: false, error: "Ye reset link invalid ya expire ho gaya hai. Naya link request kijiye." };
  }

  const passwordHash = await hashPassword(password);
  mutateDb((d) => {
    const target = d.users.find((u) => u.id === user.id);
    if (target) {
      target.passwordHash = passwordHash;
      delete target.resetTokenHash;
      delete target.resetTokenExpiresAt;
    }
  });
  await flushPendingWrites();

  revalidatePath("/login");
  redirect("/login?reset=1");
}

/* -------------------------------- logout ------------------------------- */

export async function logoutAction() {
  await clearSession();
  revalidatePath("/");
  redirect("/");
}
