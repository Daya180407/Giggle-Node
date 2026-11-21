import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/store";
import BrandLogo from "@/components/BrandLogo";
import SiteNav from "@/components/SiteNav";

export default async function SiteHeader() {
  const [user] = await Promise.all([getCurrentUser()]);
  const db = readDb();
  const savedCount = user ? db.bookmarks.filter((b) => b.userId === user.id).length : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="GigleNode home">
          <BrandLogo size={42} className="shadow-md shadow-indigo-500/20 transition group-hover:shadow-indigo-500/35 max-[360px]:hidden" />
          <span className="leading-tight">
            <span className="display block text-[17px] text-ink sm:text-[19px]">
              Gigle<span className="gradient-text">Node</span>
            </span>
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:block">
              AI Discovery Platform
            </span>
          </span>
        </Link>

        <form action="/search" className="mx-auto hidden w-full max-w-xs xl:block" role="search">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <input
              name="q"
              type="search"
              placeholder="Search AI tools, models or tasks…"
              className="w-full rounded-full border border-line bg-white/90 py-2.5 pl-10 pr-[6.2rem] text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              aria-label="Search AI tools, models and posts"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
            >
              Search
            </button>
          </div>
        </form>

        <SiteNav
          user={user ? { id: user.id, name: user.name, avatar: user.avatar, role: user.role } : null}
          savedCount={savedCount}
        />
      </div>

      <div className="border-t border-line/70 px-4 py-2 xl:hidden">
        <form action="/search" className="relative mx-auto max-w-7xl" role="search">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="q"
            type="search"
            placeholder="Search AI tools, models or tasks…"
            className="w-full rounded-full border border-line bg-white/90 py-2 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            aria-label="Search"
          />
        </form>
      </div>
    </header>
  );
}
