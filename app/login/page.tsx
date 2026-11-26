import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import LoginForm from "@/components/LoginForm";
import MagicLinkForm from "@/components/MagicLinkForm";
import { getCurrentUser } from "@/lib/auth";
import { GOOGLE_ERRORS, googleReady } from "@/lib/google-auth";
import { isStaffRole, resolveRoles } from "@/lib/roles";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to rate AI tools, save favorites and manage your ratings.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; verify?: string; error?: string; magic?: string }>;
}) {
  const { next = "/", reset, verify, error, magic } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    const db = readDb();
    const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    // Sending a non-staff account to /admin would bounce it straight back here.
    const staff = isStaffRole(user.role, resolveRoles(db.roles));
    redirect(target.startsWith("/admin") && !staff ? "/" : target);
  }
  const settings = getSiteSettings(readDb());
  const googleOn = googleReady(settings);
  const googleError = error ? GOOGLE_ERRORS[error] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        <span className="eyebrow">Account</span>
        <h1 className="display mt-1.5 text-2xl text-ink">Welcome back</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Log in to rate tools, build your list and follow the AI you care about.
        </p>

        {reset === "1" ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Your password has been updated. Log in with the new password.
          </p>
        ) : null}

        {googleError ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-relaxed text-rose-700">{googleError}</p>
        ) : null}

        {verify ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
            That verification link is invalid or has expired.{" "}
            <Link href="/verify-email" className="font-semibold underline">
              Request a new one
            </Link>
            .
          </p>
        ) : null}

        {magic === "invalid" ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
            That login link is invalid, already used or expired. Request a fresh one below.
          </p>
        ) : null}

        <div className="mt-5">
          {googleOn ? (
            <>
              <GoogleSignInButton next={next} />
              <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-line" />
                or use email
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          ) : null}
          {settings.security.emailLogin ? (
            <LoginForm next={next} />
          ) : googleOn || settings.security.magicLink ? null : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              Email and password login is currently turned off by the administrator. Please contact{" "}
              <a href={`mailto:${settings.supportEmail}`} className="font-semibold underline">
                {settings.supportEmail}
              </a>{" "}
              if you need access.
            </div>
          )}
        </div>

        {settings.security.magicLink ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[11px] leading-relaxed text-muted">
              No password needed — we email a single-use login link from our own server. No Google or other account
              provider is involved.
            </p>
            <MagicLinkForm next={next} />
          </div>
        ) : null}

        <p className="mt-3 text-center text-xs text-muted">
          Waiting for a verification email?{" "}
          <Link href="/verify-email" className="font-semibold text-brand hover:underline">
            Resend the link
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="hover:text-brand">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
