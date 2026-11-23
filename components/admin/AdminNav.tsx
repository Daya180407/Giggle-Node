"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminArea } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: string; area: AdminArea };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Catalogue",
    items: [
      { href: "/admin/ai", label: "AI & Models", icon: "🤖", area: "catalogue" },
      { href: "/admin/apps", label: "Apps & Software", icon: "📱", area: "catalogue" },
      { href: "/admin/categories", label: "Categories", icon: "🗂️", area: "categories" },
      { href: "/admin/bulk", label: "Bulk Upload", icon: "📥", area: "bulk" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/ratings", label: "Ratings & Reviews", icon: "★", area: "ratings" },
      { href: "/admin/community", label: "Community Rooms", icon: "🗨️", area: "catalogue" },
      { href: "/admin/community/inbox", label: "Community Inbox", icon: "📥", area: "catalogue" },
      { href: "/admin/prompts", label: "Prompt Library", icon: "💬", area: "catalogue" },
      { href: "/admin/submissions", label: "Submissions & Claims", icon: "📨", area: "catalogue" },
      { href: "/admin/owners", label: "AI Owners", icon: "🪪", area: "owners" },
      { href: "/admin/users", label: "Users & Roles", icon: "👥", area: "users" },
      { href: "/admin/demo", label: "Demo Dataset", icon: "🧪", area: "users" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "🔐", area: "users" },
      { href: "/admin/gamification", label: "Gamification", icon: "🏅", area: "gamification" },
      { href: "/admin/feedback", label: "Feedback Inbox", icon: "📬", area: "feedback" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/posts", label: "Posts", icon: "📝", area: "posts" },
      { href: "/admin/pages", label: "Pages & Menu", icon: "📄", area: "pages" },
      { href: "/admin/media", label: "Media Library", icon: "🖼️", area: "media" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/homepage", label: "Homepage & Quiz", icon: "🏠", area: "homepage" },
      { href: "/admin/sponsors", label: "Sponsors & Ads", icon: "💼", area: "sponsors" },
      { href: "/admin/pricing", label: "Pricing Reports", icon: "💰", area: "catalogue" },
      { href: "/admin/notifications", label: "Notifications & Email", icon: "🔔", area: "notifications" },
      { href: "/admin/analytics", label: "Analytics & Reports", icon: "📊", area: "analytics" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/search-ai", label: "AI Search", icon: "✨", area: "search" },
      { href: "/admin/security", label: "Spam & Security", icon: "🛡️", area: "security" },
      { href: "/admin/appearance", label: "Theme & Currency", icon: "🎨", area: "settings" },
      { href: "/admin/settings", label: "Site Settings", icon: "⚙️", area: "settings" },
      { href: "/admin/activity", label: "Audit Log", icon: "🕘", area: "settings" },
      { href: "/admin/export", label: "Backup / Export", icon: "⬇", area: "settings" },
    ],
  },
];

export default function AdminNav({ areas }: { areas: AdminArea[] }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => areas.includes(item.area)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Admin sections"
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#07070d] p-2 lg:sticky lg:top-32 lg:mx-0 lg:max-h-[calc(100vh-9rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-3xl lg:p-3"
    >
      <div className="contents lg:block">
        <p className="hidden px-2 pb-1.5 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 lg:block">
          Workspace
        </p>
        <div className="flex gap-1 lg:flex-col">
          <Link
            href="/admin"
            className={`group flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-[11.5px] font-medium transition lg:px-2.5 lg:py-2 lg:text-xs ${
              isActive("/admin")
                ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
          </Link>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.label} className="contents lg:block">
          <p className="hidden px-2 pb-1.5 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 lg:block">
            {group.label}
          </p>
          <div className="flex gap-1 lg:flex-col">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-[11.5px] font-medium transition lg:px-2.5 lg:py-2 lg:text-xs ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
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
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="hidden border-t border-white/10 pt-3 lg:block">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          <span aria-hidden>←</span> View public site
        </Link>
      </div>
    </nav>
  );
}
