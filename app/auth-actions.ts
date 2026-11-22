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
import { mailerConfigured } from "@/lib/mailer";
import { queueEmail, renderTemplate } from "@/lib/notify";
import { getSiteSettings } from "@/lib/settings";
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
    return { ok: false, error: "Enter both your email and password." };
  }

  const ip = await requestIp();
  // Another isolate may have created this account; verify against the latest document.
  const db = await refreshDb();
  if (!getSiteSettings(db).security.emailLogin) {
    return { ok: false, error: "Email login is turned off by the administrator." };
  }
  if (countEvents(db, "login", ip, LOGIN_WINDOW_MS) >= LOGIN_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many login attempts. Please try again in 15 minutes." };
  }

  const user = await verifyCredentials(db, email, password);
  if (!user) {
    mutateDb((d) => {
      d.authEvents.push({ ip, at: new Date().toISOString(), kind: "login" });
      pruneAuthEvents(d);
    });
    return { ok: false, error: "Incorrect email or password." };
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

  if (name.length < 2) return { ok: false, error: "Please enter your name (at least 2 characters)." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters long.` };
  }
  if (password !== confirm) return { ok: false, error: "The passwords do not match." };

  const db = await refreshDb();
  if (!getSiteSettings(db).allowSignups) {
    return { ok: false, error: "New signups are paused right now. Please try again later." };
  }
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: "This email is already registered. Please log in." };
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

  const settings = getSiteSettings(db);
  if (settings.email.enabled && settings.email.welcome) {
    const template = settings.email.templates.welcome;
    mutateDb((d) => {
      const current = getSiteSettings(d);
      queueEmail(d, current.email, {
        to: created.email,
        kind: "welcome",
        subject: template.subject,
        body: renderTemplate(template.body, { name: created.name, site: current.siteName }),
      });
    });
    await flushPendingWrites();
  }

  await startSession(user.id);
  revalidatePath("/");
  redirect(next);
}

/* --------------------------- forgot password --------------------------- */

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const ip = await requestIp();
  const db = await refreshDb();
  if (countEvents(db, "reset", ip, RESET_WINDOW_MS) >= RESET_MAX_REQUESTS) {
    return { ok: false, error: "Too many reset requests. Please try again in an hour." };
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
    // Never hand the token back to the browser once real email delivery exists:
    // that would let anyone reset any account by typing its email address.
    resetLink = mailerConfigured() ? undefined : `/reset-password/${token}`;
  } else {
    mutateDb((d) => {
      d.authEvents.push({ ip, at: new Date().toISOString(), kind: "reset" });
      pruneAuthEvents(d);
    });
  }

  return {
    ok: true,
    message: "If this email is registered, a reset link has been generated (valid for one hour).",
    resetLink,
  };
}

/* ---------------------------- reset password --------------------------- */

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters long.` };
  }
  if (password !== confirm) return { ok: false, error: "The passwords do not match." };

  const tokenHash = await sha256Hex(token);
  const user = (await refreshDb()).users.find(
    (u) => u.resetTokenHash === tokenHash && u.resetTokenExpiresAt && +new Date(u.resetTokenExpiresAt) > Date.now(),
  );
  if (!user) {
    return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };
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
