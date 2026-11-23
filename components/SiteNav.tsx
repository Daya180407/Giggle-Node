"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/auth-actions";

// Items are revealed as the header gains room: the full row plus search and
// account buttons only fits above ~1700px, so nothing is clipped before that.
const NAV = [
  { href: "/ranking", label: "Rankings" },
  { href: "/arena", label: "Arena" },
  { href: "/value", label: "Best value" },
  { href: "/compare", label: "Compare" },
  { href: "/community", label: "Community" },
  { href: "/prompts", label: "Prompts", narrow: true },
  { href: "/finder", label: "AI Finder", narrow: true },
  { href: "/blog", label: "Blog", wide: true },
  { href: "/stack", label: "Stack planner", wide: true },
];

export type HeaderUser = { id: string; name: string; avatar: string; role: string } | null;

function isActive(pathname: string, href: string) {
  if (href === "/ranking") {
    return pathname.startsWith("/ranking") || pathname.startsWith("/category") || pathname.startsWith("/ai");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNav({
  user,
  savedCount,
  unread = 0,
  extraNav = [],
}: {
  user: HeaderUser;
  savedCount: number;
  unread?: number;
  extraNav?: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems: { href: string; label: string; narrow?: boolean; wide?: boolean }[] = [...NAV, ...extraNav];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium transition ${
                item.wide ? "hidden 2xl:flex" : item.narrow ? "hidden xl:flex" : "flex"
              } ${
                active
                  ? "bg-ink text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {user && user.role !== "user" ? (
          <Link
            href="/admin"
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith("/admin")
                ? "bg-brand-soft text-brand"
                : "text-slate-600 hover:bg-slate-100 hover:text-ink"
            }`}
          >
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        {user ? (
          <Link
            href="/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-slate-600 transition hover:border-indigo-200 hover:text-brand"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5.5 8a4.5 4.5 0 019 0c0 3 1.2 4.2 1.6 4.6H3.9c.4-.4 1.6-1.6 1.6-4.6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8.2 15.2a2 2 0 003.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        ) : null}
        <Link
          href="/my-list"
          aria-label="My list"
          className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-brand sm:flex"
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M5 3.5h10v13l-5-3.2-5 3.2v-13z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden xl:inline">My List</span>
          {savedCount > 0 ? (
            <span className="rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-brand">{savedCount}</span>
          ) : null}
        </Link>

        {user ? (
          <div className="flex items-center gap-1.5">
            <Link
              href={user.role === "admin" ? "/admin" : "/profile"}
              className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 transition hover:border-indigo-200 sm:pr-3"
              title={user.role === "admin" ? "Admin dashboard" : "Your profile"}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[11px] font-bold text-white">
                {user.avatar}
              </span>
              <span className="hidden max-w-24 truncate text-sm font-medium sm:block">
                {user.role === "admin" ? "Admin" : user.name.split(" ")[0]}
              </span>
            </Link>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary !px-4 !py-2">
            Log in
          </Link>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-slate-700 2xl:hidden"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-white px-4 pb-5 pt-3 shadow-2xl shadow-slate-900/10 2xl:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1.5">
            {navItems.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`anim-rise flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive(pathname, item.href) ? "bg-brand-soft text-brand" : "text-slate-700 hover:bg-slate-50"
                } ${i === 0 ? "delay-1" : i === 1 ? "delay-2" : i === 2 ? "delay-3" : ""}`}
              >
                {item.label}
                <span aria-hidden className="text-slate-300">→</span>
              </Link>
            ))}
            {user && user.role !== "user" ? (
              <Link
                href="/admin"
                className="anim-rise flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand"
              >
                Admin dashboard
                <span aria-hidden>→</span>
              </Link>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              {user ? (
                <Link href="/notifications" className="btn btn-ghost">
                  Notifications{unread > 0 ? ` (${unread})` : ""}
                </Link>
              ) : null}
              <Link href="/my-list" className="btn btn-ghost">
                My List {savedCount > 0 ? `(${savedCount})` : ""}
              </Link>
              {user ? (
                <Link href={user.role === "admin" ? "/admin" : "/profile"} className="btn btn-ghost">
                  {user.role === "admin" ? "Admin" : "Profile"}
                </Link>
              ) : (
                <Link href="/login" className="btn btn-ghost">
                  Log in
                </Link>
              )}
            </div>
            {user ? (
              <form action={logoutAction} className="mt-1">
                <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600">
                  Log out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
