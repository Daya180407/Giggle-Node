import Link from "next/link";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { sha256Hex } from "@/lib/crypto";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = await sha256Hex(token);
  const user = readDb().users.find(
    (u) => u.resetTokenHash === tokenHash && u.resetTokenExpiresAt && +new Date(u.resetTokenExpiresAt) > Date.now(),
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        {user ? (
          <>
            <span className="eyebrow">Account recovery</span>
            <h1 className="display mt-1.5 text-2xl text-ink">Set a new password</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Choose a new password for <strong>{user.email}</strong> (at least 8 characters).
            </p>
            <div className="mt-5">
              <ResetPasswordForm token={token} />
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">Account recovery</span>
            <h1 className="display mt-1.5 text-2xl text-ink">This link is invalid or expired</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Reset links are valid for one hour and can only be used once. Request a fresh one below.
            </p>
            <Link href="/forgot-password" className="btn btn-primary mt-4">
              Request a new reset link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
