import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { demoLoginAction } from "@/app/actions";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login",
  description: "Login karke AI ko rate kijiye, bookmark kijiye aur apni ratings manage kijiye.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next.startsWith("/") ? next : "/");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Login kijiye</h1>
        <p className="mt-1 text-sm text-muted">
          Rating dene, bookmark karne aur follow karne ke liye login zaroori hai.
        </p>

        <div className="mt-5">
          <LoginForm next={next} />
        </div>

        <div className="my-5 flex items-center gap-2 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          demo accounts
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <form action={demoLoginAction}>
            <input type="hidden" name="role" value="user" />
            <input type="hidden" name="next" value={next} />
            <button className="btn btn-ghost w-full text-xs">Demo User</button>
          </form>
          <form action={demoLoginAction}>
            <input type="hidden" name="role" value="admin" />
            <input type="hidden" name="next" value="/admin" />
            <button className="btn btn-ghost w-full text-xs">Admin</button>
          </form>
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
