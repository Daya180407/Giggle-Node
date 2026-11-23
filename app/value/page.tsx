import Link from "next/link";
import type { Metadata } from "next";
import PlanMatrix, { type MatrixRow } from "@/components/PlanMatrix";
import { AiLogo, SectionHead, Stars } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import { valueRows } from "@/lib/insight";
import { bestApiSummary, formatPlanPrice } from "@/lib/plans";
import { buildView, rankedAis } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";
import type { AppearanceSettings, SubscriptionPlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best Value AI Tools (2026) — Score per Dollar",
  description:
    "Which AI tool gives the most rating for the least money? Free picks, cheapest paid plans and a side-by-side plan matrix built from live scores and list prices.",
  alternates: { canonical: "/value" },
};

function money(usd: number, appearance: AppearanceSettings): string {
  if (appearance.currency === "INR") {
    const inr = Math.round(usd * (appearance.usdRate > 0 ? appearance.usdRate : 88));
    return `₹${inr.toLocaleString("en-IN")}/mo`;
  }
  return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}/mo`;
}

function planCard(plan: SubscriptionPlan, appearance: AppearanceSettings) {
  return { name: plan.name, price: formatPlanPrice(plan, appearance), note: plan.note };
}

export default async function ValuePage() {
  const db = readDb();
  const view = buildView(db);
  const settings = getSiteSettings(db);
  const appearance = settings.appearance;
  const { paid, free } = valueRows(view, 12);

  const matrix: MatrixRow[] = rankedAis(view)
    .filter((stat) => (stat.ai.plans?.length ?? 0) > 0 || stat.ai.planPrice > 0)
    .slice(0, 10)
    .map((stat) => {
      const plans = [...(stat.ai.plans ?? [])].sort((a, b) => a.priceMonthly - b.priceMonthly);
      const fallback: SubscriptionPlan[] =
        plans.length === 0 && stat.ai.planPrice > 0
          ? [
              {
                id: `${stat.ai.id}-start`,
                name: "Starting plan",
                priceMonthly: stat.ai.planPrice,
                priceYearly: null,
                priceInr: stat.ai.planPriceInr ?? null,
                note: "",
              },
            ]
          : plans;
      return {
        slug: stat.ai.slug,
        name: stat.ai.name,
        logo: stat.ai.logo,
        color: stat.ai.color,
        score: stat.score,
        category: categoryName(stat.ai.category),
        plans: fallback.slice(0, 3).map((plan) => planCard(plan, appearance)),
        apiFrom: bestApiSummary(stat.ai, db.models),
        priceType: stat.ai.priceType,
      };
    });

  const bestValue = paid[0];
  const totalVotes = [...view.aiStats.values()].reduce((sum, stat) => sum + stat.votes, 0);

  return (
    <div>
      <section className="lab-hero">
        <div className="lab-grid" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-9 sm:px-6 sm:pt-12">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="chip border border-white/15 bg-white/[0.06] text-slate-300">
                💸 Value board · list prices, live scores
              </span>
              <h1 className="display mt-4 text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.04] text-white">
                The most rating
                <br />
                <span className="hero-gradient">per rupee.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                A high score is not a bargain if the plan costs more than the job is worth. This board divides the live
                weighted score by the cheapest paid monthly plan, and lists genuinely free tools separately.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/ranking" className="btn bg-white text-ink hover:bg-slate-100">
                  Task-first rankings →
                </Link>
                <Link href="/stack" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
                  Build a stack
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Cheapest strong pick</p>
              {bestValue ? (
                <div className="mt-2 flex items-center gap-3">
                  <AiLogo
                    slug={bestValue.stat.ai.slug}
                    logo={bestValue.stat.ai.logo}
                    color={bestValue.stat.ai.color}
                    size={46}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{bestValue.stat.ai.name}</p>
                    <p className="text-[11px] text-slate-400">
                      ★ {bestValue.stat.score.toFixed(1)} · {money(bestValue.monthly ?? 0, appearance)} ·{" "}
                      {bestValue.planName}
                    </p>
                  </div>
                  <Link href={`/ai/${bestValue.stat.ai.slug}`} className="btn bg-white !px-2.5 !py-1.5 text-xs text-ink">
                    Open
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Not enough priced plans yet.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px]">
                <div>
                  <p className="text-slate-500">Free picks</p>
                  <p className="font-bold text-white">{free.length}</p>
                </div>
                <div>
                  <p className="text-slate-500">Votes behind scores</p>
                  <p className="font-bold text-white">{totalVotes.toLocaleString("en-US")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHead
          eyebrow="Paid plans"
          title="Cost per rating point"
          subtitle="Lower is better. We divide the cheapest monthly plan by the live score, so a 4.8★ tool at $10 beats a 4.9★ tool at $30 — and both are shown with the plan they assume."
        />
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_5rem_7rem_7rem] gap-3 border-b border-line bg-slate-50/70 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted sm:grid">
            <span>Rank</span>
            <span>Tool</span>
            <span>Score</span>
            <span>Cheapest plan</span>
            <span className="text-right">Per rating point</span>
          </div>
          <ol className="divide-y divide-line/80">
            {paid.map((row, i) => (
              <li
                key={row.stat.ai.id}
                className={`flex items-center gap-3 px-3 py-3 sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_7rem_7rem] sm:px-4 ${
                  i === 0 ? "bg-amber-50/40" : ""
                }`}
              >
                <span className="medal-plain medal h-7 w-7 shrink-0 text-[11px]">{i + 1}</span>
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <AiLogo slug={row.stat.ai.slug} logo={row.stat.ai.logo} color={row.stat.ai.color} size={34} />
                  <div className="min-w-0">
                    <Link href={`/ai/${row.stat.ai.slug}`} className="truncate text-[13px] font-bold text-ink hover:text-brand">
                      {row.stat.ai.name}
                    </Link>
                    <p className="truncate text-[11px] text-muted">
                      {row.planName} · {categoryName(row.stat.ai.category)}
                    </p>
                  </div>
                </div>
                <span className="hidden text-sm font-bold text-ink sm:block">{row.stat.score.toFixed(1)}</span>
                <span className="hidden text-xs font-semibold text-slate-600 sm:block">
                  {money(row.monthly ?? 0, appearance)}
                </span>
                <span className="ml-auto text-right sm:ml-0">
                  <span className="block text-sm font-extrabold text-brand">
                    ${(row.costPerPoint ?? 0).toFixed(1)}
                  </span>
                  <span className="block text-[10px] text-muted">per 1.0★</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="border-t border-line bg-slate-50/40 px-4 py-2.5 text-[11px] leading-relaxed text-muted">
            Plans are monthly list prices converted at the site rate. Annual discounts, usage limits and taxes are not
            modelled — this is a shortlist, not a quote.
          </p>
        </div>

        <section className="mt-10">
          <SectionHead
            eyebrow="Zero cost"
            title="Free tools that still score"
            subtitle="Free tier or genuinely free — ordered by live score, not by an affiliate deal."
          />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {free.map((row) => (
              <Link
                key={row.stat.ai.id}
                href={`/ai/${row.stat.ai.slug}`}
                className="lab-panel flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-emerald-200"
              >
                <AiLogo slug={row.stat.ai.slug} logo={row.stat.ai.logo} color={row.stat.ai.color} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{row.stat.ai.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Stars value={row.stat.score} size={12} />
                    <span className="text-[11px] font-semibold text-ink">{row.stat.score.toFixed(1)}</span>
                  </div>
                </div>
                <span className="chip bg-emerald-50 text-emerald-700">Free</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <SectionHead
            eyebrow="Plan matrix"
            title="Put the plans side by side"
            subtitle="Choose up to four tools. Free tier, entry plans and API starting rates in one table."
          />
          <div className="card p-4 sm:p-5">
            <PlanMatrix rows={matrix} />
          </div>
        </section>
      </div>
    </div>
  );
}
