import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
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
  searchParams: Promise<{ next?: string; reset?: string; verify?: string }>;
}) {
  const { next = "/", reset, verify } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  const settings = getSiteSettings(readDb());

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

        {verify ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
            That verification link is invalid or has expired.{" "}
            <Link href="/verify-email" className="font-semibold underline">
              Request a new one
            </Link>
            .
          </p>
        ) : null}

        <div className="mt-5">
          {settings.security.emailLogin ? (
            <LoginForm next={next} />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              Email and password login is currently turned off by the administrator. Please contact{" "}
              <a href={`mailto:${settings.supportEmail}`} className="font-semibold underline">
                {settings.supportEmail}
              </a>{" "}
              if you need access.
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-line bg-slate-50/80 p-3.5 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Demo account</p>
          <p className="mt-1">
            Email: <code>demo@giglenode.com</code> · Password: <code>demo12345</code>
          </p>
          <p className="mt-1 text-muted">
            Create your own account to keep ratings and saved tools under your name.
          </p>
        </div>

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
