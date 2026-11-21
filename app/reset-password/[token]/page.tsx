import Link from "next/link";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { sha256Hex } from "@/lib/crypto";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Naya password set kijiye",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = await sha256Hex(token);
  const user = readDb().users.find(
    (u) => u.resetTokenHash === tokenHash && u.resetTokenExpiresAt && +new Date(u.resetTokenExpiresAt) > Date.now(),
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        {user ? (
          <>
            <h1 className="text-xl font-extrabold">Naya password set kijiye</h1>
            <p className="mt-1 text-sm text-muted">
              <strong>{user.email}</strong> ke liye naya password chuniye (kam se kam 8 characters).
            </p>
            <div className="mt-5">
              <ResetPasswordForm token={token} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-extrabold">Link invalid ya expire ho gaya</h1>
            <p className="mt-2 text-sm text-muted">
              Reset link 1 ghante ke liye valid hota hai aur ek hi baar chal sakta hai. Naya link request kijiye.
            </p>
            <Link href="/forgot-password" className="btn btn-primary mt-4">
              Naya reset link banaiye
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
