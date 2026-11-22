"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo, PriceBadge, Stars } from "@/components/ui";
import type { PriceType } from "@/lib/types";

export type ChampionRow = {
  rank: number;
  slug: string;
  name: string;
  logo: string;
  color: string;
  score: number;
  votes: number;
  priceType: PriceType;
  bestFor: string;
};

export type ChampionCategory = {
  slug: string;
  label: string;
  emoji: string;
  rows: ChampionRow[];
};

const TITLES = ["Champion", "Runner-up", "Third place"];

function ChampionCard({ row }: { row: ChampionRow }) {
  const first = row.rank === 1;
  const order = row.rank === 1 ? "order-1 sm:order-2" : row.rank === 2 ? "order-2 sm:order-1" : "order-3";

  return (
    <article
      className={`${order} anim-pop relative flex h-full flex-col items-center overflow-hidden rounded-2xl p-5 text-center ${
        first ? "champ-first sm:-mt-4 sm:pb-7" : "card"
      } ${row.rank === 2 ? "delay-1 sm:mt-3" : row.rank === 3 ? "delay-2 sm:mt-6" : ""}`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span
          className={`chip ${
            first
              ? "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 ring-1 ring-amber-200"
              : "bg-slate-50 text-slate-500 ring-1 ring-line"
          }`}
        >
          {first ? "👑 " : "#"}
          {first ? TITLES[0] : `#${row.rank} ${TITLES[row.rank - 1]}`}
        </span>
        <span className="text-xs font-bold text-slate-400">{row.votes.toLocaleString("en-US")} votes</span>
      </div>

      <div className={`relative mt-5 ${first ? "anim-float" : ""}`}>
        <AiLogo slug={row.slug} logo={row.logo} color={row.color} size={first ? 76 : 60} rounded="rounded-2xl" />
        {first ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[11px] shadow-md shadow-amber-500/30">
            ★
          </span>
        ) : null}
      </div>

      <Link href={`/ai/${row.slug}`} className="mt-3 text-lg font-bold text-ink hover:text-brand">
        {row.name}
      </Link>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.bestFor}</p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        <Stars value={row.score} size={16} />
        <span className="text-sm font-extrabold text-ink">{row.score.toFixed(1)}</span>
      </div>

      <div className="mt-3 w-full">
        <div className="score-bar">
          <span style={{ width: `${Math.max(6, Math.min(100, (row.score / 5) * 100))}%` }} />
        </div>
      </div>

      <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
        <PriceBadge price={row.priceType} />
        <Link
          href={`/ai/${row.slug}`}
          className={`btn flex-1 !py-2 text-xs ${first ? "btn-dark" : "btn-ghost"}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}

export default function ChampionPodium({ categories }: { categories: ChampionCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const current = categories.find((c) => c.slug === active) ?? categories[0];
  if (!current) return null;

  return (
    <div className="relative">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {categories.map((category) => {
          const selected = category.slug === current.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => setActive(category.slug)}
              aria-pressed={selected}
              className={`chip shrink-0 !px-3 !py-2 text-[12px] transition ${
                selected
                  ? "bg-ink text-white shadow-md shadow-slate-900/10"
                  : "border border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
              }`}
            >
              <span aria-hidden>{category.emoji}</span>
              {category.label}
            </button>
          );
        })}
      </div>

      <div
        key={current.slug}
        className="mt-5 grid gap-3 sm:grid-cols-3 sm:items-start"
        aria-live="polite"
      >
        {current.rows.map((row) => (
          <ChampionCard key={row.slug} row={row} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Ranked by weighted score and recency — a 5.0 from 3 votes cannot outrank a 4.7 from 500.
        </p>
        <Link
          href={`/category/${current.slug}`}
          className="text-sm font-semibold text-brand transition hover:text-brand-dark"
        >
          All {current.label} AI →
        </Link>
      </div>
    </div>
  );
}
