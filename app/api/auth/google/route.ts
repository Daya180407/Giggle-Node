import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_SCOPE,
  GOOGLE_STATE_COOKIE,
  googleCallbackUrl,
  googleReady,
  requestOrigin,
  safeNextPath,
} from "@/lib/google-auth";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Starts the Google OAuth flow: validates settings, sets a state cookie, redirects to Google. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = await requestOrigin();
  const next = safeNextPath(url.searchParams.get("next"), "/profile");
  const settings = getSiteSettings(readDb());

  if (!googleReady(settings)) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", origin));
  }

  const state = randomToken();
  const callback = await googleCallbackUrl();
  const params = new URLSearchParams({
    client_id: settings.security.googleClientId.trim(),
    redirect_uri: callback,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    state,
    prompt: "select_account",
    access_type: "online",
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  const secure = origin.startsWith("https://");
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
    secure,
  };
  response.cookies.set(GOOGLE_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(GOOGLE_NEXT_COOKIE, next, cookieOptions);
  return response;
}
