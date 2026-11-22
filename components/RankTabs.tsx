"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import { formatVotes } from "@/lib/format";
import type { PriceType } from "@/lib/types";

export type RankRow = {
  rank: number;
  id: string;
  slug: string;
  name: string;
  logo: string;
  color: string;
  score: number;
  votes: number;
  priceType: PriceType;
  trend: "up" | "down" | "flat";
  sponsored: boolean;
  website: string;
  bestFor: string;
};

export type RankTab = { slug: string; label: string; rows: RankRow[] };

const MEDALS = ["medal-1", "medal-2", "medal-3"];

export default function RankTabs({ tabs }: { tabs: RankTab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug ?? "all");
  const current = tabs.find((t) => t.slug === active) ?? tabs[0];

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const selected = tab.slug === active;
          return (
            <button
              key={tab.slug}
              onClick={() => setActive(tab.slug)}
              className={`chip shrink-0 !px-3 !py-2 text-[12px] transition ${
                selected
                  ? "bg-ink text-white shadow-md shadow-slate-900/10"
                  : "border border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
              }`}
              aria-pressed={selected}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 hidden grid-cols-[2rem_3rem_minmax(0,1fr)_7.5rem_5.5rem_5.5rem] items-center gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:grid">
        <span>Rank</span>
        <span aria-hidden />
        <span>AI tool</span>
        <span>Weighted score</span>
        <span>Pricing</span>
        <span className="text-right">Visit</span>
      </div>

      <div className="space-y-1">
        {current?.rows.length ? (
          current.rows.map((row) => {
            const top = row.rank <= 3;
            return (
              <div
                key={row.id}
                className={`rank-row rank-row-v2 group relative flex items-center gap-2.5 rounded-2xl px-2 py-2.5 sm:grid sm:grid-cols-[2rem_3rem_minmax(0,1fr)_7.5rem_5.5rem_5.5rem] sm:gap-3 sm:px-3 ${
                  top ? "rank-top" : ""
                }`}
              >
                <div className="relative shrink-0 sm:justify-self-center">
                  <span className={`medal h-8 w-8 ${MEDALS[row.rank - 1] ?? "medal-plain"}`}>
                    {row.rank === 1 ? "★" : row.rank}
                  </span>
                  {top ? (
                    <span
                      aria-hidden
                      className="absolute -inset-1 -z-10 rounded-xl opacity-0 blur-md transition group-hover:opacity-70"
                      style={{ background: row.color }}
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:contents">
                  <div className="shrink-0">
                    <AiLogo
                      slug={row.slug}
                      logo={row.logo}
                      color={row.color}
                      size={46}
                      rounded="rounded-xl"
                      className="transition group-hover:-translate-y-0.5"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/ai/${row.slug}`}
                        className="truncate text-[13.5px] font-bold text-ink transition hover:text-brand sm:text-sm"
                      >
                        {row.name}
                      </Link>
                      {row.sponsored ? <SponsoredTag /> : null}
                      <Trend trend={row.trend} />
                      <span className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80 sm:hidden">
                        ★ {row.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{row.bestFor}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <Stars value={row.score} size={14} />
                      <span className="text-[10.5px] text-muted">{formatVotes(row.votes)} votes</span>
                      <PriceBadge price={row.priceType} />
                    </div>
                  </div>

                  <div className="hidden w-32 shrink-0 sm:block">
                    <div className="flex items-baseline justify-between gap-1 text-xs">
                      <span className="text-sm font-extrabold text-ink">{row.score.toFixed(1)}</span>
                      <span className="text-[10px] text-muted">{formatVotes(row.votes)}</span>
                    </div>
                    <div className="score-bar mt-1.5">
                      <span style={{ width: `${Math.max(6, Math.min(100, (row.score / 5) * 100))}%` }} />
                    </div>
                  </div>

                  <div className="hidden shrink-0 sm:block">
                    <PriceBadge price={row.priceType} />
                  </div>

                  <a
                    href={row.website}
                    target="_blank"
                    rel="nofollow noopener noreferrer sponsored"
                    aria-label={`Visit ${row.name}`}
                    className="btn ml-auto !rounded-lg !border-line !bg-white !px-2 !py-1.5 text-[11px] text-slate-600 transition hover:!border-indigo-200 hover:!bg-brand-soft hover:!text-brand sm:ml-0 sm:w-full sm:justify-center"
                  >
                    Visit <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-10 text-center text-sm text-muted">No AI tools in this category yet.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
        <Link href={`/category/${current?.slug ?? "all"}`} className="btn btn-ghost !py-2 text-xs">
          View full ranking →
        </Link>
        <p className="text-[11px] text-muted">Weighted score · lower-vote tools stay below proven ones.</p>
      </div>
    </div>
  );
}
