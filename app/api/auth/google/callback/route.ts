import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeEmail, requestIp, SESSION_COOKIE } from "@/lib/auth";
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/crypto";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  googleCallbackUrl,
  googleReady,
  requestOrigin,
  safeNextPath,
} from "@/lib/google-auth";
import { getSiteSettings } from "@/lib/settings";
import { flushPendingWrites, mutateDb, refreshDb, uid } from "@/lib/store";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

/**
 * Google redirects here with a one-time code. The code is exchanged server-side
 * with the client secret stored in the admin settings, so the browser never sees
 * it. Only a Google-verified email may sign in, and a matching local account is
 * linked instead of duplicated.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = await requestOrigin();
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const next = safeNextPath(cookieStore.get(GOOGLE_NEXT_COOKIE)?.value, "/profile");
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    response.cookies.delete(GOOGLE_NEXT_COOKIE);
    return response;
  };
  const fail = (reason: string) => finish(`/login?error=${reason}&next=${encodeURIComponent(next)}`);

  const db = await refreshDb();
  const settings = getSiteSettings(db);
  if (!googleReady(settings)) return fail("google-not-configured");
  if (!code || !state || !expectedState || state !== expectedState) return fail("google-state");

  const callback = await googleCallbackUrl();
  let accessToken = "";
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: settings.security.googleClientId.trim(),
        client_secret: settings.security.googleClientSecret.trim(),
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail("google-token");
    const token = (await tokenResponse.json()) as { access_token?: string };
    accessToken = token.access_token ?? "";
  } catch {
    return fail("google-token");
  }
  if (!accessToken) return fail("google-token");

  let profile: GoogleProfile;
  try {
    const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!infoResponse.ok) return fail("google-token");
    profile = (await infoResponse.json()) as GoogleProfile;
  } catch {
    return fail("google-failed");
  }

  const email = normalizeEmail(profile.email ?? "");
  const googleId = profile.sub ?? "";
  if (!googleId || !email || profile.email_verified !== true) return fail("google-email");

  const ip = await requestIp();
  const now = new Date().toISOString();
  let user = db.users.find((row) => row.email.toLowerCase() === email);
  if (user?.banned) return fail("google-banned");

  if (!user) {
    if (!settings.allowSignups) return fail("google-signups-paused");
    const name = (profile.name ?? "").trim().slice(0, 60) || email.split("@")[0];
    const created: User = {
      id: uid("u"),
      name,
      email,
      avatar: name.slice(0, 1).toUpperCase(),
      role: "user",
      createdAt: now,
      emailVerified: true,
      googleId,
    };
    user = mutateDb((draft) => {
      const existing = draft.users.find((row) => row.email.toLowerCase() === email);
      if (existing) return existing;
      draft.users.push(created);
      draft.authEvents.push({ ip, at: now, kind: "signup", who: email });
      return created;
    });
  }

  const userId = user.id;
  // A Google-verified mailbox satisfies the site's email verification step. If the
  // account was only a never-verified email signup, its password is removed too:
  // whoever typed that address first must not keep a way in once the real owner
  // proves they control the mailbox through Google.
  const wasUnverified = user.emailVerified === false;
  if (user.googleId !== googleId || wasUnverified) {
    mutateDb((draft) => {
      const row = draft.users.find((item) => item.id === userId);
      if (!row) return;
      row.googleId = googleId;
      row.emailVerified = true;
      if (wasUnverified) {
        delete row.passwordHash;
        delete row.resetTokenHash;
        delete row.resetTokenExpiresAt;
      }
      delete row.verifyTokenHash;
      delete row.verifyTokenExpiresAt;
      draft.authEvents.push({ ip, at: new Date().toISOString(), kind: "login", who: email });
    });
  }
  await flushPendingWrites();

  const response = finish(next);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: origin.startsWith("https://"),
  });
  return response;
}
