import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "▦" },
  { href: "/admin/ai", label: "AI & Models", icon: "🤖" },
  { href: "/admin/posts", label: "Posts", icon: "📝" },
  { href: "/admin/ratings", label: "Ratings", icon: "★" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/sponsors", label: "Sponsors & Boost", icon: "💼" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login?next=/admin");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Admin Dashboard</h1>
          <p className="text-xs text-muted">
            {user.name} · sirf admin ke liye. Sab changes turant live ranking me dikhte hain.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-ghost text-xs">
            ← Site dekhein
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-ghost text-xs">Log out</button>
          </form>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium hover:border-indigo-200 hover:text-brand"
            >
              <span aria-hidden className="text-xs">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
