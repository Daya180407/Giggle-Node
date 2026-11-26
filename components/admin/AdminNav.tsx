"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AdminArea } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: string; area: AdminArea; adminOnly?: boolean };

const GROUPS: { label: string; tone: string; items: NavItem[] }[] = [
  {
    label: "Catalogue",
    tone: "from-violet-400 to-indigo-300",
    items: [
      { href: "/admin/ai", label: "AI & Models", icon: "🤖", area: "catalogue" },
      { href: "/admin/apps", label: "Apps & Software", icon: "📱", area: "catalogue" },
      { href: "/admin/categories", label: "Categories", icon: "🗂️", area: "categories" },
      { href: "/admin/bulk", label: "Bulk Upload", icon: "📥", area: "bulk" },
    ],
  },
  {
    label: "Community",
    tone: "from-emerald-400 to-teal-300",
    items: [
      { href: "/admin/ratings", label: "Ratings & Reviews", icon: "★", area: "ratings" },
      { href: "/admin/community", label: "Community Rooms", icon: "🗨️", area: "catalogue" },
      { href: "/admin/community/inbox", label: "Community Inbox", icon: "📥", area: "catalogue" },
      { href: "/admin/community/reports", label: "Reports & Bans", icon: "⚑", area: "catalogue" },
      { href: "/admin/prompts", label: "Prompt Library", icon: "💬", area: "catalogue" },
      { href: "/admin/submissions", label: "Submissions & Claims", icon: "📨", area: "catalogue" },
      { href: "/admin/owners", label: "AI Owners", icon: "🪪", area: "owners" },
      { href: "/admin/gamification", label: "Gamification", icon: "🏅", area: "gamification" },
      { href: "/admin/feedback", label: "Feedback Inbox", icon: "📬", area: "feedback" },
    ],
  },
  {
    label: "Content",
    tone: "from-sky-400 to-cyan-300",
    items: [
      { href: "/admin/posts", label: "Posts", icon: "📝", area: "posts" },
      { href: "/admin/pages", label: "Pages & Menu", icon: "📄", area: "pages" },
      { href: "/admin/media", label: "Media Library", icon: "🖼️", area: "media" },
    ],
  },
  {
    label: "Growth",
    tone: "from-amber-400 to-orange-300",
    items: [
      { href: "/admin/homepage", label: "Homepage & Quiz", icon: "🏠", area: "homepage" },
      { href: "/admin/polls", label: "Polls & Insights", icon: "📊", area: "homepage" },
      { href: "/admin/sponsors", label: "Sponsors & Ads", icon: "💼", area: "sponsors" },
      { href: "/admin/payments", label: "Payments & Checkout", icon: "💳", area: "payments" },
      { href: "/admin/ads", label: "Chat Ads & Insights", icon: "📣", area: "sponsors" },
      { href: "/admin/pricing", label: "Pricing Reports", icon: "💰", area: "catalogue" },
      { href: "/admin/notifications", label: "Notifications & Email", icon: "🔔", area: "notifications" },
      { href: "/admin/analytics", label: "Analytics & Reports", icon: "📈", area: "analytics" },
    ],
  },
  {
    label: "Administrator",
    tone: "from-rose-400 to-pink-300",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: "👥", area: "users", adminOnly: true },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "🔐", area: "users", adminOnly: true },
      { href: "/admin/security", label: "Spam & Security", icon: "🛡️", area: "security", adminOnly: true },
      { href: "/admin/settings", label: "Site Settings", icon: "⚙️", area: "settings", adminOnly: true },
      { href: "/admin/activity", label: "Audit Log", icon: "🕘", area: "settings", adminOnly: true },
      { href: "/admin/export", label: "Backup / Export", icon: "⬇", area: "settings", adminOnly: true },
    ],
  },
  {
    label: "Site style",
    tone: "from-fuchsia-400 to-violet-300",
    items: [
      { href: "/admin/search-ai", label: "AI Search", icon: "✨", area: "search" },
      { href: "/admin/appearance", label: "Theme & Prices", icon: "🎨", area: "settings" },
    ],
  },
];

/** Links to the member-side pages every signed-in account keeps. */
const MEMBER_LINKS = [
  { href: "/profile", label: "My profile" },
  { href: "/my-list", label: "My list" },
  { href: "/notifications", label: "Notifications" },
  { href: "/contributors", label: "Leaderboard" },
];

export default function AdminNav({
  areas,
  isAdmin = false,
  roleName = "Staff",
}: {
  areas: AdminArea[];
  /** super admin sees every section, including the administrator-only group */
  isAdmin?: boolean;
  roleName?: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const q = query.trim().toLowerCase();
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        areas.includes(item.area) &&
        (isAdmin || !item.adminOnly) &&
        (!q || item.label.toLowerCase().includes(q) || item.href.slice(1).replaceAll("/", " ").includes(q)),
    ),
  })).filter((group) => group.items.length > 0);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <nav
      aria-label="Admin sections"
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#07070d] p-2 lg:sticky lg:top-32 lg:mx-0 lg:max-h-[calc(100vh-9rem)] lg:flex-col lg:gap-0 lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-3xl lg:p-3"
    >
      {/* Sidebar header + search (desktop) */}
      <div className="hidden px-1.5 pb-2 lg:block">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" aria-hidden />
            Admin menu
          </p>
          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-500">
            {total}
          </span>
        </div>
        <p className="mt-1 text-[10.5px] text-slate-500">
          {isAdmin ? "Super admin · all sections" : `${roleName} · your sections`}
        </p>
        <label className="mt-2 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 focus-within:border-cyan-300/40">
          <span aria-hidden className="text-[11px] text-slate-500">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a section…"
            aria-label="Filter admin sections"
            className="w-full bg-transparent text-[11.5px] text-white placeholder:text-slate-600 focus:outline-none"
          />
        </label>
      </div>

      {/* Mobile: dashboard chip */}
      <Link
        href="/admin"
        aria-current={isActive("/admin") ? "page" : undefined}
        className={`group flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-[11.5px] font-medium transition lg:hidden ${
          isActive("/admin") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] ${
            isActive("/admin") ? "bg-gradient-to-br from-violet-400 to-cyan-300 text-[#07070d]" : "bg-white/[0.06]"
          }`}
        >
          ▦
        </span>
        <span className="whitespace-nowrap">Dashboard</span>
      </Link>

      <Link
        href="/admin"
        aria-current={isActive("/admin") ? "page" : undefined}
        className={`relative hidden items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition lg:flex ${
          isActive("/admin")
            ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] transition ${
            isActive("/admin")
              ? "bg-gradient-to-br from-violet-400 to-cyan-300 text-[#07070d]"
              : "bg-white/[0.06] group-hover:bg-white/10"
          }`}
        >
          ▦
        </span>
        <span className="whitespace-nowrap">Dashboard</span>
        {isActive("/admin") ? <span aria-hidden className="ml-auto text-[10px] text-cyan-300">●</span> : null}
      </Link>

      {groups.map((group) => {
        const collapsed = Boolean(closed[group.label]) && !q;
        return (
          <div key={group.label} className="contents lg:mt-3 lg:block">
            <button
              type="button"
              onClick={() => setClosed((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
              aria-expanded={!collapsed}
              className="hidden w-full items-center gap-1.5 rounded-lg px-2 pb-1 pt-1.5 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 transition hover:text-slate-400 lg:flex"
            >
              <span className={`h-1 w-1 rounded-full bg-gradient-to-r ${group.tone}`} aria-hidden />
              <span className="flex-1">{group.label}</span>
              <span aria-hidden className={`text-[9px] transition ${collapsed ? "-rotate-90" : ""}`}>
                ▾
              </span>
            </button>
            <div className={`${collapsed ? "lg:hidden" : ""} flex gap-1 lg:flex-col`}>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-[11.5px] font-medium transition lg:px-2.5 lg:py-1.5 lg:text-[11.5px] ${
                      active
                        ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute bottom-1.5 left-0 top-1.5 hidden w-[2.5px] rounded-full bg-gradient-to-b from-violet-300 to-cyan-300 lg:block"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] transition ${
                        active
                          ? "bg-gradient-to-br from-violet-400 to-cyan-300 text-[#07070d]"
                          : "bg-white/[0.06] group-hover:bg-white/10"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap lg:truncate">{item.label}</span>
                    {active ? <span aria-hidden className="ml-auto hidden text-[9px] text-cyan-300 lg:block">●</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {groups.length === 0 ? (
        <p className="hidden px-2 py-4 text-[11px] leading-relaxed text-slate-500 lg:block">
          No section matches “{query.trim()}”.
        </p>
      ) : null}

      <div className="hidden border-t border-white/10 pt-3 lg:mt-3 lg:block">
        <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">My account</p>
        <div className="flex flex-col">
          {MEMBER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11.5px] font-medium text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <span aria-hidden>·</span> {item.label}
            </Link>
          ))}
        </div>
        <Link
          href="/"
          className="mt-2 flex items-center gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2 text-[11.5px] font-medium text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          <span aria-hidden>←</span> View public site
        </Link>
      </div>
    </nav>
  );
}
