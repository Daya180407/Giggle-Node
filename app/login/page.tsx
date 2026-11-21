import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login",
  description: "Login karke AI ko rate kijiye, bookmark kijiye aur apni ratings manage kijiye.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next = "/", reset } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Login kijiye</h1>
        <p className="mt-1 text-sm text-muted">
          Rating dene, bookmark karne aur follow karne ke liye login zaroori hai.
        </p>

        {reset === "1" ? (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Password update ho gaya. Ab naye password se login kijiye.
          </p>
        ) : null}

        <div className="mt-5">
          <LoginForm next={next} />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Demo account</p>
          <p className="mt-1">
            Email: <code>demo@giglenode.com</code> · Password: <code>demo12345</code>
          </p>
          <p className="mt-1 text-muted">
            Apna account banane ke liye sign up kijiye — rating aur bookmarks tab aapke naam se save honge.
          </p>
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
