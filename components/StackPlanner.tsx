"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatVotes } from "@/lib/format";

export type PlannerTool = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  category: string;
  categoryName: string;
  score: number;
  votes: number;
  priceType: string;
  price: number;
};

type Pick = { category: string; categoryName: string; tool: PlannerTool | null; skipped?: boolean };

/**
 * Builds the highest-rated tool set that fits a monthly budget.
 * Greedy by category: the best tool per chosen category that still fits.
 */
export default function StackPlanner({ tools, categories }: { tools: PlannerTool[]; categories: { slug: string; name: string; emoji: string }[] }) {
  const [budget, setBudget] = useState(30);
  const initial = categories.slice(0, 3).map((c) => c.slug);
  const [selected, setSelected] = useState<string[]>(initial);

  function toggle(slug: string) {
    setSelected((current) => (current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]));
  }

  const picks = useMemo<Pick[]>(() => {
    let remaining = budget;
    const ordered = selected
      .map((slug) => {
        const pool = tools.filter((tool) => tool.category === slug);
        const best = pool.slice().sort((a, b) => b.score - a.score)[0] ?? null;
        return { slug, best };
      })
      .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0));

    return ordered.map(({ slug, best }) => {
      const categoryName = tools.find((tool) => tool.category === slug)?.categoryName ?? slug;
      if (!best) return { category: slug, categoryName, tool: null };
      const affordable = tools
        .filter((tool) => tool.category === slug && tool.price <= remaining)
        .sort((a, b) => b.score - a.score)[0];
      if (!affordable) return { category: slug, categoryName, tool: best, skipped: true };
      remaining -= affordable.price;
      return { category: slug, categoryName, tool: affordable };
    });
  }, [budget, selected, tools]);

  const chosen = picks.filter((pick) => pick.tool && !pick.skipped);
  const total = chosen.reduce((sum, pick) => sum + (pick.tool?.price ?? 0), 0);
  const remaining = Math.max(0, budget - total);
  const freeCount = chosen.filter((pick) => pick.tool?.price === 0).length;
  const average = chosen.length
    ? chosen.reduce((sum, pick) => sum + (pick.tool?.score ?? 0), 0) / chosen.length
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <div className="card h-fit p-4">
        <label className="label" htmlFor="stack-budget">
          Monthly budget: <span className="font-extrabold text-brand">${budget}</span>
        </label>
        <input
          id="stack-budget"
          type="range"
          min={0}
          max={150}
          step={5}
          value={budget}
          onChange={(event) => setBudget(Number(event.target.value))}
          className="mt-1 w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-muted">
          <span>$0</span>
          <span>$150</span>
        </div>

        <p className="label mt-4">What do you need it for?</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const active = selected.includes(category.slug);
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => toggle(category.slug)}
                aria-pressed={active}
                className={`chip transition ${
                  active
                    ? "border border-indigo-200 bg-brand-soft font-semibold text-brand"
                    : "border border-line bg-white text-slate-600 hover:border-indigo-200"
                }`}
              >
                {category.emoji} {category.name}
              </button>
            );
          })}
        </div>
        {selected.length === 0 ? <p className="mt-3 text-xs text-muted">Pick at least one category.</p> : null}

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Your stack</p>
          <p className="mt-1 text-xl font-extrabold text-ink">
            ${total}
            <span className="text-xs font-medium text-muted"> / month</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {chosen.length} tools · ${remaining} left · {freeCount} free
          </p>
          {chosen.length ? (
            <p className="mt-1 text-[11px] text-muted">
              Average rating <strong className="text-ink">{average.toFixed(1)} ★</strong>
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {picks.map((pick) => {
          const tool = pick.tool;
          if (!tool) {
            return (
              <div key={pick.category} className="card p-3 text-xs text-muted">
                No tool listed under {pick.categoryName} yet.
              </div>
            );
          }
          return (
            <div
              key={pick.category}
              className={`card flex flex-wrap items-center gap-3 p-3 ${pick.skipped ? "opacity-60" : ""}`}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                style={{ background: `${tool.color}18`, color: tool.color }}
                aria-hidden
              >
                {tool.logo}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{pick.categoryName}</p>
                <Link href={`/ai/${tool.slug}`} className="block truncate text-sm font-semibold text-ink hover:text-brand">
                  {tool.name}
                </Link>
                <p className="text-[11px] text-muted">
                  {tool.score.toFixed(1)} ★ · {formatVotes(tool.votes)} votes · {tool.priceType}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-ink">{tool.price === 0 ? "Free" : `$${tool.price}`}</p>
                <p className="text-[10px] text-muted">{tool.price === 0 ? "no card needed" : "per month"}</p>
              </div>
              {pick.skipped ? (
                <p className="w-full border-l-2 border-amber-300 pl-2 text-[11px] leading-relaxed text-amber-800">
                  Best pick here is ${tool.price} — over the remaining budget. Raise the budget or drop another category.
                </p>
              ) : null}
            </div>
          );
        })}

        {chosen.length >= 2 ? (
          <div className="card border-indigo-100 bg-brand-soft/40 p-4">
            <h2 className="text-sm font-bold text-ink">Verdict</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              This stack costs <strong>${total}/month</strong> and averages{" "}
              <strong>{average.toFixed(1)} ★</strong> from real user votes. Compare the picks side by side before you
              commit:
            </p>
            <Link
              href={`/compare/${chosen.map((pick) => pick.tool?.slug).filter(Boolean).slice(0, 3).join("-vs-")}`}
              className="btn btn-primary mt-2 text-xs"
            >
              Compare this stack →
            </Link>
          </div>
        ) : null}

        <p className="px-1 text-[10.5px] leading-relaxed text-muted">
          Starting prices only, in USD. Annual plans and team seats are not included. Ratings are weighted real user
          votes — a paid placement never enters this calculation.
        </p>
      </div>
    </div>
  );
}
