import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignupForm from "@/components/SignupForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a GigleNode account — rate AI tools, save your shortlist and track your ratings.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/profile" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        <span className="eyebrow">Get started</span>
        <h1 className="display mt-1.5 text-2xl text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          One account lets you rate tools, build a shortlist and edit your ratings later.
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
