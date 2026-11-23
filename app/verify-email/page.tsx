import Link from "next/link";
import type { Metadata } from "next";
import ResendVerificationForm from "@/components/ResendVerificationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Request a new verification link to finish creating your GigleNode account.",
  robots: { index: false, follow: true },
};

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        <span className="eyebrow">Account</span>
        <h1 className="display mt-1.5 text-2xl text-ink">Verify your email</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          New accounts are activated from a magic link sent to your inbox. Enter the email you signed up with and we
          will send a fresh link (valid for 24 hours).
        </p>
        <div className="mt-5">
          <ResendVerificationForm />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/login" className="hover:text-brand">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
