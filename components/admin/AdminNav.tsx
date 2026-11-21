"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; download?: boolean };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [{ href: "/admin", label: "Overview", icon: "▦" }],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/ai", label: "AI & Models", icon: "🤖" },
      { href: "/admin/apps", label: "Apps & Software", icon: "📱" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: "👥" },
      { href: "/admin/ratings", label: "Ratings", icon: "★" },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/admin/posts", label: "Posts", icon: "📝" }],
  },
  {
    label: "Growth",
    items: [{ href: "/admin/sponsors", label: "Sponsors & Boost", icon: "💼" }],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Site Settings", icon: "⚙️" },
      { href: "/admin/activity", label: "Audit Log", icon: "🕘" },
      { href: "/admin/export", label: "Export Data", icon: "⬇", download: true },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Admin sections"
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-32 lg:mx-0 lg:max-h-[calc(100vh-9rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-3xl lg:border lg:border-white/10 lg:bg-[#07070d] lg:p-3 lg:pb-3"
    >
      {GROUPS.map((group) => (
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
