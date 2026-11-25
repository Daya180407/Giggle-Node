import { headers } from "next/headers";
import { getSiteSettings } from "./settings";
import { readDb } from "./store";
import type { SiteSettings } from "./types";

/**
 * Google OAuth 2.0 helpers.
 *
 * The owner stores the client ID and secret from the admin panel
 * (/admin/security → Login control), so no environment variable or redeploy is
 * needed to switch Google sign-in on. The callback URL is derived from the
 * request host, which keeps localhost, previews and production working without
 * per-host configuration — register each host's URL in the Google console.
 */

export const GOOGLE_STATE_COOKIE = "gn_oauth_state";
export const GOOGLE_NEXT_COOKIE = "gn_oauth_next";
export const GOOGLE_SCOPE = "openid email profile";

export function googleReady(settings: SiteSettings = getSiteSettings(readDb())): boolean {
  const security = settings.security;
  return (
    security.googleLogin &&
    security.googleClientId.trim().length > 0 &&
    security.googleClientSecret.trim().length > 0
  );
}

/** Absolute origin of the current request, honouring the proxy headers. */
export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerList.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function googleCallbackUrl(): Promise<string> {
  return `${await requestOrigin()}/api/auth/google/callback`;
}

/** Only same-origin relative paths, so `//evil.com` cannot become an open redirect. */
export function safeNextPath(value: string | null | undefined, fallback = "/profile"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** User-facing message for each `?error=` value the callback can redirect with. */
export const GOOGLE_ERRORS: Record<string, string> = {
  "google-disabled": "Google sign-in is turned off right now. Use email and password instead.",
  "google-not-configured": "Google sign-in is not configured yet. Ask the site owner to add the OAuth client in the admin panel.",
  "google-state": "That Google sign-in attempt expired or was tampered with. Please try again.",
  "google-token": "Google could not confirm the sign-in. Please try again.",
  "google-email": "Google did not share a verified email address for that account.",
  "google-banned": "This account has been suspended. Contact support if you think that is a mistake.",
  "google-signups-paused": "New signups are paused right now. Please try again later.",
  "google-failed": "Google sign-in failed. Please try again or use email and password.",
};
