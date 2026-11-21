"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/auth-actions";

const NAV = [
  { href: "/category/all", label: "Rankings" },
  { href: "/compare", label: "Compare" },
  { href: "/finder", label: "AI Finder" },
  { href: "/blog", label: "Blog" },
  { href: "/contributors", label: "Contributors" },
];

export type HeaderUser = { id: string; name: string; avatar: string; role: string } | null;

function isActive(pathname: string, href: string) {
  if (href === "/category/all") return pathname.startsWith("/category") || pathname.startsWith("/ai");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNav({ user, savedCount }: { user: HeaderUser; savedCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-ink text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {user?.role === "admin" ? (
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
            <form action={logoutAction}>
              <button
                type="submit"
                title="Log out"
                aria-label="Log out"
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M8 4H5v12h3M12.5 6.5L16 10l-3.5 3.5M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
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
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-slate-700 lg:hidden"
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
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-white px-4 pb-5 pt-3 shadow-2xl shadow-slate-900/10 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1.5">
            {NAV.map((item, i) => (
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
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className="anim-rise flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-semibold text-brand"
              >
                Admin dashboard
                <span aria-hidden>→</span>
              </Link>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
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
