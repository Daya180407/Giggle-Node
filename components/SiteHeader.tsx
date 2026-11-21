import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/store";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/category/all", label: "Rankings" },
  { href: "/compare", label: "Compare" },
  { href: "/finder", label: "AI Finder" },
  { href: "/blog", label: "Blog" },
  { href: "/contributors", label: "Contributors" },
];

export default async function SiteHeader() {
  const [user] = await Promise.all([getCurrentUser()]);
  const db = readDb();
  const savedCount = user ? db.bookmarks.filter((b) => b.userId === user.id).length : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="GigleNode home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">
              G
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight sm:block">
              Gigle<span className="text-brand">Node</span>
            </span>
          </Link>

          <form action="/search" className="hidden flex-1 sm:block">
            <div className="relative mx-auto max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                name="q"
                type="search"
                placeholder="AI, model ya kaam search kijiye…"
                className="field !py-2.5 pl-9"
                aria-label="Search AI, models and posts"
              />
            </div>
          </form>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-brand-soft hover:text-brand-dark"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/my-list"
              className="hidden items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-brand sm:flex"
            >
              <span aria-hidden>🔖</span> My List
              {savedCount > 0 ? (
                <span className="rounded-full bg-brand-soft px-1.5 text-xs font-bold text-brand">{savedCount}</span>
              ) : null}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={user.role === "admin" ? "/admin" : "/profile"}
                  className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-indigo-200"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {user.avatar}
                  </span>
                  <span className="max-w-24 truncate text-sm font-medium">
                    {user.role === "admin" ? "Admin" : user.name.split(" ")[0]}
                  </span>
                </Link>
                <form action={logoutAction}>
                  <button className="rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100" title="Log out">
                    ⏻
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary">
                Login
              </Link>
            )}
          </div>
        </div>

        <form action="/search" className="pb-3 sm:hidden">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              name="q"
              type="search"
              placeholder="AI, model ya kaam search kijiye…"
              className="field !py-2.5 pl-9"
              aria-label="Search"
            />
          </div>
        </form>
      </div>

      <div className="border-t border-line lg:hidden">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-1.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/my-list" className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600">
            My List
          </Link>
        </div>
      </div>
    </header>
  );
}
