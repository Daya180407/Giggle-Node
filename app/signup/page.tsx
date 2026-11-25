import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SignupForm from "@/components/SignupForm";
import { getCurrentUser } from "@/lib/auth";
import { googleReady } from "@/lib/google-auth";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a GiggleNode account — rate AI tools, save your shortlist and track your ratings.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/profile" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/profile");
  const settings = getSiteSettings(readDb());
  const googleOn = settings.allowSignups && googleReady(settings);

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        <span className="eyebrow">Get started</span>
        <h1 className="display mt-1.5 text-2xl text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {settings.allowSignups
            ? "One account lets you rate tools, build a shortlist and edit your ratings later."
            : "New account creation is temporarily paused by the administrator."}
        </p>
        <div className="mt-5">
          {settings.allowSignups ? (
            <>
              {googleOn ? (
                <>
                  <GoogleSignInButton next={next} />
                  <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <span className="h-px flex-1 bg-line" />
                    or sign up with email
                    <span className="h-px flex-1 bg-line" />
                  </div>
                </>
              ) : null}
              <SignupForm next={next} />
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Signups are paused</p>
              <p className="mt-1 text-xs leading-relaxed">
                You can still log in with an existing account. If you need access, contact {settings.supportEmail}.
              </p>
              <Link href="/login" className="btn btn-ghost mt-3 !py-2 text-xs">
                Go to login
              </Link>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="hover:text-brand">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
