"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
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

const RANK_STYLE = [
  "bg-amber-100 text-amber-700",
  "bg-slate-100 text-slate-600",
  "bg-orange-100 text-orange-700",
];

export default function RankTabs({ tabs }: { tabs: RankTab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug ?? "all");
  const current = tabs.find((t) => t.slug === active) ?? tabs[0];

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            onClick={() => setActive(tab.slug)}
            className={`chip shrink-0 !px-3 !py-1.5 transition ${
              tab.slug === active
                ? "bg-brand text-white"
                : "border border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
            }`}
            aria-pressed={tab.slug === active}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 divide-y divide-line">
        {current?.rows.length ? (
          current.rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                  RANK_STYLE[row.rank - 1] ?? "bg-slate-50 text-slate-500"
                }`}
              >
                {row.rank}
              </span>
              <AiLogo logo={row.logo} color={row.color} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/ai/${row.slug}`} className="truncate text-sm font-semibold hover:text-brand">
                    {row.name}
                  </Link>
                  {row.sponsored ? <SponsoredTag /> : null}
                </div>
                <p className="truncate text-xs text-muted">{row.bestFor}</p>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Stars value={row.score} size={12} />
                <span className="w-8 text-xs font-semibold">{row.score.toFixed(1)}</span>
                <span className="w-12 text-right text-xs text-muted">({row.votes})</span>
                <Trend trend={row.trend} />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted md:inline">{row.votes} votes</span>
                <PriceBadge price={row.priceType} />
                <a
                  href={row.website}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="btn btn-ghost !px-2 !py-1 text-xs"
                >
                  Visit
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted">Is category me abhi koi AI nahi hai.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/category/${current?.slug ?? "all"}`} className="btn btn-ghost">
          Saare AI Dekhein →
        </Link>
        <p className="text-xs text-muted">
          Ranking weighted score se banti hai (kam votes wala 5.0 star, zyada votes wale 4.7 se upar nahi jata).
        </p>
      </div>
    </div>
  );
}
