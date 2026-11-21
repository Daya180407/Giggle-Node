import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignupForm from "@/components/SignupForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Naya GigleNode account banaiye — AI rate kijiye, bookmark kijiye aur apni ratings track kijiye.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/profile" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Naya account banaiye</h1>
        <p className="mt-1 text-sm text-muted">
          Ek account se aap AI rate kar sakte hain, bookmark rakh sakte hain aur apni ratings edit kar sakte hain.
        </p>
        <div className="mt-5">
          <SignupForm next={next} />
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
