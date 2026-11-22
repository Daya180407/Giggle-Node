import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/store";
import { activeLogo } from "@/lib/analytics";
import { unreadNotifications } from "@/lib/notify";
import { menuFor } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import BrandLogo from "@/components/BrandLogo";
import SiteNav from "@/components/SiteNav";

export default async function SiteHeader() {
  const [user] = await Promise.all([getCurrentUser()]);
  const db = readDb();
  const settings = getSiteSettings(db);
  const savedCount = user ? db.bookmarks.filter((b) => b.userId === user.id).length : 0;
  const unread = user ? unreadNotifications(db, user) : 0;
  const logo = activeLogo(settings.appearance);
  const extraNav = menuFor(db, "header").map((item) => ({ href: item.href, label: item.label }));

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-1.5 px-3 sm:gap-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${settings.siteName} home`}>
          {logo ? (
            <img
              src={logo}
              alt={settings.siteName}
              width={42}
              height={42}
              className="h-[42px] w-[42px] shrink-0 rounded-[0.85rem] border border-line bg-white object-cover shadow-md shadow-indigo-500/20 max-[360px]:hidden"
            />
          ) : (
            <BrandLogo size={42} className="shadow-md shadow-indigo-500/20 transition group-hover:shadow-indigo-500/35 max-[360px]:hidden" />
          )}
          <span className="leading-tight">
            <span className="display block text-[17px] text-ink sm:text-[19px]">
              Gigle<span className="gradient-text">Node</span>
            </span>
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:block">
              AI Discovery Platform
            </span>
          </span>
        </Link>

        <SiteNav
          user={user ? { id: user.id, name: user.name, avatar: user.avatar, role: user.role } : null}
          savedCount={savedCount}
          unread={unread}
          extraNav={extraNav}
        />
      </div>

      <div data-site-search className="border-t border-line/70 px-4 py-2">
        <form action="/search" className="relative mx-auto max-w-[96rem]" role="search">
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
