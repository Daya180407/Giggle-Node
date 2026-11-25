"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSession,
  normalizeEmail,
  requestIp,
  startSession,
  verifyCredentials,
} from "@/lib/auth";
import { hashPassword, randomToken, sha256Hex } from "@/lib/crypto";
import { deliverEmails, mailerConfigured } from "@/lib/mailer";
import { queueEmail, renderTemplate } from "@/lib/notify";
import { getSiteSettings } from "@/lib/settings";
import { flushPendingWrites, mutateDb, readDb, refreshDb, uid } from "@/lib/store";
import type { AuthEvent, DB, User } from "@/lib/types";

export type AuthState = {
  ok: boolean;
  error?: string;
  message?: string;
  resetLink?: string;
  /** only when email delivery is not configured, so the flow stays testable */
  verifyLink?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_REQUESTS = 3;
const RESET_TTL_MS = 60 * 60 * 1000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFY_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_MAX_REQUESTS = 3;

/** Only same-origin relative paths, so `//evil.com` cannot be used as an open redirect. */
function safeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/** Absolute origin for links inside email, taken from the request the user came from. */
async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host") ?? "gigglenode.com";
  return `${proto}://${host}`;
}

/** Fresh single-use magic link for a new account (valid for 24 hours). */
async function issueVerifyLink(user: User): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
  mutateDb((d) => {
    const target = d.users.find((u) => u.id === user.id);
    if (target) {
      target.emailVerified = false;
      target.verifyTokenHash = tokenHash;
      target.verifyTokenExpiresAt = expiresAt;
    }
  });
  return token;
}

/** Queue the verification mail and deliver it right away when Resend is configured. */
async function sendVerifyMail(user: User, token: string, next: string): Promise<void> {
  const link = `${await siteOrigin()}/verify-email/${token}?next=${encodeURIComponent(next)}`;
  mutateDb((d) => {
    const current = getSiteSettings(d);
    queueEmail(d, current.email, {
      to: user.email,
      kind: "verify",
      subject: renderTemplate("Verify your {{site}} email", { site: current.siteName }),
      body: renderTemplate(
        `Hi {{name}},\n\nOpen this link to finish creating your {{site}} account:\n\n${link}\n\nThe link works once and expires in 24 hours. If you did not sign up, ignore this email.\n\n— The {{site}} team`,
        { name: user.name, site: current.siteName },
      ),
      force: true,
    });
  });
  await flushPendingWrites();
  if (!mailerConfigured()) return;

  const queued = (readDb().emailOutbox ?? []).filter(
    (m) => m.status === "queued" && m.kind === "verify" && m.to.toLowerCase() === user.email.toLowerCase(),
  );
  if (queued.length === 0) return;
  const results = await deliverEmails(queued);
  mutateDb((d) => {
    for (const result of results) {
      const row = d.emailOutbox?.find((m) => m.id === result.id);
      if (!row) continue;
      if (result.ok) {
        row.status = "sent";
        row.sentAt = new Date().toISOString();
      } else {
        row.status = "failed";
        row.error = (result.error ?? "Delivery failed").slice(0, 220);
      }
    }
  });
}

function pruneAuthEvents(db: DB) {
  const cutoff = Date.now() - EVENT_TTL_MS;
  db.authEvents = db.authEvents.filter((event) => +new Date(event.at) > cutoff);
}

function countEvents(db: DB, kind: AuthEvent["kind"], ip: string, windowMs: number): number {
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
  if (user.emailVerified === false) {
    return {
      ok: false,
      error: "Verify your email first — open the magic link we sent when you signed up, or request a new one on the verify-email page.",
    };
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
    emailVerified: false,
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

  // Account is created but signed out until the emailed magic link is opened.
  const token = await issueVerifyLink(user);
  await sendVerifyMail(user, token, next);

  revalidatePath("/");
  return {
    ok: true,
    message: mailerConfigured()
      ? `Almost done — open the verification link we emailed to ${created.email} to finish creating your account.`
      : `Almost done — open the verification link below to finish creating ${created.email}.`,
    verifyLink: mailerConfigured() ? undefined : `/verify-email/${token}?next=${encodeURIComponent(next)}`,
  };
}

/* --------------------------- resend verification --------------------------- */

export async function resendVerificationAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const ip = await requestIp();
  const db = await refreshDb();
  if (countEvents(db, "verify", ip, VERIFY_WINDOW_MS) >= VERIFY_MAX_REQUESTS) {
    return { ok: false, error: "Too many verification emails. Please try again in an hour." };
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email && u.emailVerified === false);
  let verifyLink: string | undefined;
  if (user) {
    const token = await issueVerifyLink(user);
    await sendVerifyMail(user, token, "/profile");
    verifyLink = mailerConfigured() ? undefined : `/verify-email/${token}?next=%2Fprofile`;
  }
  mutateDb((d) => {
    d.authEvents.push({ ip, at: new Date().toISOString(), kind: "verify" });
    pruneAuthEvents(d);
  });

  return {
    ok: true,
    message: "If that email is waiting for verification, a fresh link is on its way (valid for 24 hours).",
    verifyLink,
  };
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
