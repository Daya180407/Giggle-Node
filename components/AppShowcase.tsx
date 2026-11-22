"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AiLogo from "@/components/AiLogo";
import PricingReport from "@/components/PricingReport";
import { PriceBadge, Stars } from "@/components/ui";
import type { AppGroup } from "@/lib/apps/types";
import type { PriceType } from "@/lib/types";

export type AppShowcaseItem = {
  slug: string;
  name: string;
  group: string;
  logo: string;
  color: string;
  score?: number;
  price: PriceType;
  platforms: string[];
  note: string;
  href: string;
  external: boolean;
  iconSrc: string;
  kind: "mobile" | "desktop";
  plans: { name: string; price: string; note?: string }[];
  apiNote: string | null;
};

const TABS = [
  { key: "mobile" as const, label: "Mobile apps", hint: "iOS & Android", glyph: "▢" },
  { key: "desktop" as const, label: "PC software", hint: "Windows, macOS & Linux", glyph: "▣" },
];

export default function AppShowcase({
  mobile,
  desktop,
  mobileGroups,
  desktopGroups,
}: {
  mobile: AppShowcaseItem[];
  desktop: AppShowcaseItem[];
  mobileGroups: AppGroup[];
  desktopGroups: AppGroup[];
}) {
  const [tab, setTab] = useState<"mobile" | "desktop">("mobile");
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const items = tab === "mobile" ? mobile : desktop;
  const groups = tab === "mobile" ? mobileGroups : desktopGroups;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inGroup = group === "all" || item.group === group;
      const inQuery = !q || [item.name, item.note, ...item.platforms].join(" ").toLowerCase().includes(q);
      return inGroup && inQuery;
    });
  }, [items, group, query]);

  const showAll = expanded || group !== "all" || query.trim().length > 0;
  const visible = showAll ? filtered : filtered.slice(0, 9);
  const scored = items.filter((item) => typeof item.score === "number");
  const average = scored.length ? scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length : 0;
  const selectedGroup = groups.find((g) => g.key === group);

  function switchTab(next: "mobile" | "desktop") {
    setTab(next);
    setGroup("all");
    setQuery("");
    setExpanded(false);
  }

  return (
    <div>
      <div className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {TABS.map((t) => {
              const active = t.key === tab;
              const count = t.key === "mobile" ? mobile.length : desktop.length;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                    active
                      ? "bg-ink text-white shadow-lg shadow-slate-900/15"
                      : "border border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
                  }`}
                >
                  <span aria-hidden className={active ? "text-cyan-300" : "text-slate-400"}>
                    {t.glyph}
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold leading-tight">
                      {t.label} <span className={active ? "text-slate-300" : "text-muted"}>({count})</span>
                    </span>
                    <span className={`block text-[10px] ${active ? "text-slate-300" : "text-muted"}`}>{t.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">Official apps · no installers hosted here</p>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="search-shell !mt-0 flex-1 sm:max-w-xs">
            <span className="search-inner !py-1.5">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden className="text-slate-400">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${tab === "mobile" ? "mobile apps" : "PC software"}…`}
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
                aria-label={`Search ${tab === "mobile" ? "mobile apps" : "PC software"}`}
              />
            </span>
          </label>
          <span className="text-[11px] text-muted">
            {filtered.length} {filtered.length === 1 ? "app" : "apps"}
            {selectedGroup ? ` in ${selectedGroup.label}` : ""}
          </span>
        </div>

        <div className="no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setGroup("all")}
            className={`chip shrink-0 !px-3 !py-1.5 text-[11px] ${
              group === "all" ? "bg-ink text-white" : "border border-line bg-white text-slate-600 hover:text-brand"
            }`}
          >
            All
          </button>
          {groups.map((g) => {
            const active = g.key === group;
            const count = items.filter((item) => item.group === g.key).length;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={`chip shrink-0 !px-3 !py-1.5 text-[11px] ${
                  active ? "bg-brand text-white" : "border border-line bg-white text-slate-600 hover:text-brand"
                }`}
              >
                {g.label} <span className={active ? "text-white/70" : "text-muted"}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={`${tab}-${group}-${query}`} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, i) => {
          const body = (
            <>
              <AiLogo
                src={item.iconSrc}
                logo={item.logo}
                color={item.color}
                size={44}
                rounded="rounded-xl"
                className="shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink group-hover:text-brand">{item.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{item.note}</span>
                  </span>
                  {item.external ? (
                    <span aria-hidden className="mt-0.5 text-xs text-slate-300 transition group-hover:text-brand">
                      ↗
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1">
                  {item.platforms.map((p) => (
                    <span key={p} className="platform-chip">
                      {p}
                    </span>
                  ))}
                  <PriceBadge price={item.price} />
                  {typeof item.score === "number" ? (
                    <span className="ml-auto shrink-0 text-[11px] font-bold text-amber-600">★ {item.score.toFixed(1)}</span>
                  ) : null}
                </span>
                {item.plans.length ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {item.plans.slice(0, 4).map((plan) => (
                      <span
                        key={plan.name}
                        title={plan.note}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                      >
                        {plan.name}
                        <span className="font-normal text-muted">{plan.price}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
                {item.apiNote ? (
                  <span className="mt-1 block text-[10px] leading-snug text-muted">{item.apiNote}</span>
                ) : null}
              </span>
            </>
          );

          const className =
            "app-card anim-rise group flex flex-col rounded-xl border border-line bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md";

          return (
            <div key={`${tab}-${item.slug}`} className={className} style={{ animationDelay: `${i * 30}ms` }}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-start gap-3"
                >
                  {body}
                </a>
              ) : (
                <Link href={item.href} className="flex items-start gap-3">
                  {body}
                </Link>
              )}
              <PricingReport
                targetType="app"
                targetId={item.slug}
                targetName={item.name}
                back="/#apps"
                compact
              />
            </div>
          );
        })}
        {visible.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-muted">
            No apps matched. Try another category or search.
          </p>
        ) : null}
      </div>

      {!showAll && filtered.length > visible.length ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="btn btn-ghost !py-2 text-xs"
          >
            Show all {filtered.length} {tab === "mobile" ? "mobile apps" : "PC software"} →
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1">
        {average ? <Stars value={average} size={15} /> : <span className="text-[11px] text-muted">Official app icons</span>}
        <p className="text-[11px] text-muted">
          AI-backed apps link to live ratings. Standalone tools link to their official site or store listing.
        </p>
      </div>
    </div>
  );
}
