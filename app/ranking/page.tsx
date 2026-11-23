import Link from "next/link";
import type { Metadata } from "next";
import { AiLogo, SectionHead } from "@/components/ui";
import { USE_CASES, rankUseCase } from "@/lib/usecases";
import { awaitingRatings, movers } from "@/lib/insight";
import { formatVotes } from "@/lib/format";
import { buildView, rankedAis } from "@/lib/rank";
import { readDb } from "@/lib/store";
import { categoryName } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Rankings by Use Case (2026) — Task-First Leaderboard",
  description:
    "Ranked AI tools for the job you actually have: blog writing, thumbnails, code review, research, voiceover and more. Every list shows its method and the live score behind it.",
  alternates: { canonical: "/ranking" },
};

export default async function RankingHubPage() {
  const db = readDb();
  const view = buildView(db);
  const all = rankedAis(view);
  const totalVotes = all.reduce((sum, stat) => sum + stat.votes, 0);
  const useCaseBoards = USE_CASES.map((useCase) => ({
    useCase,
    top: rankUseCase(view, useCase).slice(0, 3),
  }));
  const momentum = movers(view, 5);
  const unranked = awaitingRatings(view, 6);

  return (
    <div>
      <section className="lab-hero">
        <div className="lab-grid" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-9 sm:px-6 sm:pb-10 sm:pt-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="chip border border-white/15 bg-white/[0.06] text-slate-300">
                <span className="live-dot" aria-hidden /> November 2026 · live data
              </span>
              <h1 className="display mt-4 text-[clamp(2.1rem,4.6vw,3.5rem)] leading-[1.04] tracking-[-0.04em] text-white">
                Ranked for the <span className="hero-gradient">job</span>,
                <br className="hidden sm:block" /> not the hype.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                A category tells you where a tool sits. A use case tells you what to open on Monday morning. Every
                list here is built from the same weighted score, with the method and the arithmetic visible.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/arena" className="btn bg-white text-ink hover:bg-slate-100">
                  ⚔️ Enter the blind arena
                </Link>
                <Link href="/value" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
                  💸 Best value picks
                </Link>
                <Link href="/category/all" className="btn border border-white/10 bg-transparent text-slate-300 hover:bg-white/10">
                  Full leaderboard
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { label: "Use-case boards", value: String(USE_CASES.length), hint: "task-first rankings" },
                { label: "Tools ranked", value: String(all.length), hint: "visible catalogue" },
                { label: "Votes counted", value: formatVotes(totalVotes), hint: "model + overall" },
                { label: "Method", value: "2 layers", hint: "model + overall, 50-vote prior" },
              ].map((tile) => (
                <div key={tile.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{tile.label}</p>
                  <p className="display mt-1.5 text-2xl text-white">{tile.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{tile.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHead
          eyebrow="Task-first rankings"
          title="Pick the job, get the shortlist"
          subtitle="Each board ranks the tools whose own listings mention that job first, then the rest of the category as a fallback — so none of these pages is ever thin."
          action={
            <Link href="/finder" className="btn btn-ghost !py-2 text-xs">
              Not sure? Take the finder →
            </Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseBoards.map(({ useCase, top }) => (
            <Link
              key={useCase.slug}
              href={`/ranking/${useCase.slug}`}
              className="lab-panel group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xl" aria-hidden>
                    {useCase.emoji}
                  </span>
                  <h3 className="mt-1.5 font-bold text-ink transition group-hover:text-brand">{useCase.label}</h3>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">{useCase.blurb}</p>
                </div>
                <span className="chip border border-line bg-white text-slate-500">{categoryName(useCase.category)}</span>
              </div>

              <ol className="mt-3 space-y-1.5 border-t border-line/70 pt-3">
                {top.map((row, i) => (
                  <li key={row.stat.ai.id} className="flex items-center gap-2">
                    <span className="w-3 text-[10px] font-bold text-slate-400">{i + 1}</span>
                    <AiLogo
                      slug={row.stat.ai.slug}
                      logo={row.stat.ai.logo}
                      color={row.stat.ai.color}
                      size={22}
                      rounded="rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{row.stat.ai.name}</span>
                    <span className="text-[11px] font-bold tabular-nums text-ink">{row.stat.score.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
              <span className="mt-3 text-[11px] font-semibold text-brand">Open board →</span>
            </Link>
          ))}
        </div>

        {/* Method */}
        <section id="method" className="mt-12 scroll-mt-32">
          <SectionHead
            eyebrow="Method"
            title="You can check every number"
            subtitle="No opaque combined score and no vendor test reported as if it were our own. This is the whole formula."
          />
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lab-panel p-5 lg:col-span-2">
              <div className="rounded-xl border border-line bg-slate-50/70 p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-700">
                score = (model votes × model average + 50 × directory average) ÷ (model votes + 50)
                <br />
                final = (model votes × score + 2 × overall votes × overall average) ÷ (model votes + 2 × overall votes)
              </div>
              <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-slate-600">
                <li>
                  <strong className="text-ink">Recency is capped.</strong> Ratings from the last 30 days count up to
                  1.5×, older votes settle toward 1.0×. A tool cannot ride one good week forever.
                </li>
                <li>
                  <strong className="text-ink">Small samples are damped.</strong> The 50-vote directory prior keeps a
                  5.0 from three votes below a 4.6 from a thousand.
                </li>
                <li>
                  <strong className="text-ink">Paid placement is labelled.</strong> Sponsorship and manual boosts are
                  shown on the tool page and never change the formula.
                </li>
              </ul>
            </div>
            <div className="lab-panel p-5">
              <p className="eyebrow">Confidence</p>
              <h3 className="display mt-1.5 text-lg text-ink">How much to trust a rank</h3>
              <div className="mt-3 space-y-2 text-xs leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="chip bg-emerald-50 text-emerald-700">High</span>
                  <span className="text-slate-600">1,000+ votes. The score is stable between visits.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="chip bg-amber-50 text-amber-700">Building</span>
                  <span className="text-slate-600">100–999 votes. Watch the trend, not one decimal place.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="chip bg-slate-100 text-slate-600">Early</span>
                  <span className="text-slate-600">Under 100 votes. Useful signal, not a verdict.</span>
                </p>
              </div>
              <Link href="/category/all" className="mt-4 inline-flex text-xs font-semibold text-brand">
                See the full leaderboard →
              </Link>
            </div>
          </div>
        </section>

        {/* Movers */}
        <section className="mt-12">
          <SectionHead
            eyebrow="This week"
            title="Movers & fresh ratings"
            subtitle="Momentum uses real ratings from the last seven days. When the week is quiet, the newest listings take the shelf instead."
            action={
              <Link href="/arena" className="text-sm font-semibold text-brand hover:text-brand-dark">
                Vote in the arena →
              </Link>
            }
          />
          {momentum.length ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {momentum.map((row) => (
                <Link
                  key={row.stat.ai.id}
                  href={`/ai/${row.stat.ai.slug}`}
                  className="lab-panel flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200"
                >
                  <AiLogo slug={row.stat.ai.slug} logo={row.stat.ai.logo} color={row.stat.ai.color} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{row.stat.ai.name}</p>
                    <p className="text-[11px] text-muted">
                      {row.votes7 > 0
                        ? `${row.votes7} new ${row.votes7 === 1 ? "rating" : "ratings"} this week`
                        : `Recent drift ${row.drift > 0 ? "+" : ""}${row.drift.toFixed(2)}★`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-ink">{row.stat.score.toFixed(1)}</p>
                    <p
                      className={`text-[10px] font-bold ${
                        row.direction === "up"
                          ? "text-emerald-600"
                          : row.direction === "down"
                            ? "text-rose-500"
                            : "text-slate-400"
                      }`}
                    >
                      {row.direction === "up" ? "▲ up" : row.direction === "down" ? "▼ down" : "– steady"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="lab-panel p-5 text-sm text-muted">
              No fresh ratings this week yet — the first new vote appears here immediately.
            </p>
          )}

          {unranked.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Awaiting their first rating</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unranked.map((stat) => (
                  <Link
                    key={stat.ai.id}
                    href={`/ai/${stat.ai.slug}`}
                    className="chip border border-dashed border-line bg-white text-slate-600 transition hover:border-indigo-300 hover:text-brand"
                  >
                    {stat.ai.name} · rate it →
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
