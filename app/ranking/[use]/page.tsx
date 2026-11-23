import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import RankingTable from "@/components/RankingTable";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { SectionHead } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import { formatVotes } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { buildView } from "@/lib/rank";
import { rankUseCase, relatedUseCases, useCaseBySlug, USE_CASES } from "@/lib/usecases";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ use: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { use } = await params;
  const found = useCaseBySlug(use);
  if (!found) return { title: "Ranking not found" };
  return {
    title: `Best AI for ${found.label} (2026) — Ranked by Real Ratings`,
    description: `${found.blurb} Ranked ${found.label.toLowerCase()} AI tools with a transparent weighted score, vote counts and pricing.`,
    alternates: { canonical: `/ranking/${found.slug}` },
  };
}

export default async function UseCaseRankingPage({ params }: Props) {
  const { use } = await params;
  const useCase = useCaseBySlug(use);
  if (!useCase) notFound();

  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const rows = rankUseCase(view, useCase);
  const stats = rows.map((row) => row.stat);
  const reasons = Object.fromEntries(rows.map((row) => [row.stat.ai.id, row.reasons]));
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);
  const totalVotes = stats.reduce((sum, stat) => sum + stat.votes, 0);
  const matchedCount = rows.filter((row) => row.matches).length;
  const leader = rows[0];
  const related = relatedUseCases(useCase);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/ranking" className="hover:text-brand">
          Rankings
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-600">{useCase.label}</span>
      </nav>

      <header className="lab-hero mt-3 rounded-3xl !border !border-white/10">
        <div className="lab-grid" aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 max-w-2xl">
              <span className="chip border border-white/15 bg-white/[0.06] text-slate-300">
                <span aria-hidden>{useCase.emoji}</span> {categoryName(useCase.category)} · use case
              </span>
              <h1 className="display mt-3 text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.06] text-white">
                Best AI for <span className="hero-gradient">{useCase.label.toLowerCase()}</span>
              </h1>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-400">{useCase.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip border border-white/10 bg-white/[0.05] text-slate-300">{stats.length} tools ranked</span>
                <span className="chip border border-white/10 bg-white/[0.05] text-slate-300">
                  {formatVotes(totalVotes)} votes
                </span>
                <span className="chip border border-white/10 bg-white/[0.05] text-slate-300">
                  {matchedCount} list this job
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Link href="/arena" className="btn bg-white text-ink hover:bg-slate-100">
                ⚔️ Test these blind
              </Link>
              <Link href="/ranking" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
                All use cases →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="no-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {USE_CASES.map((item) => (
          <Link
            key={item.slug}
            href={`/ranking/${item.slug}`}
            className={`chip shrink-0 border px-2.5 py-1.5 transition ${
              item.slug === useCase.slug
                ? "border-transparent bg-ink text-white"
                : "border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
            }`}
          >
            <span aria-hidden>{item.emoji}</span> {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="card min-w-0 p-4 sm:p-5" aria-labelledby="usecase-ranking">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="usecase-ranking" className="display text-lg text-ink">
                {useCase.label} ranking
              </h2>
              <p className="text-xs text-muted">
                Matched on each listing&apos;s own best-for text, then ordered by the live weighted score.
              </p>
            </div>
            <span className="chip chip-brand">Weighted + recency</span>
          </div>
          <RankingTable stats={stats} reasons={reasons} />
        </section>

        <aside className="min-w-0 space-y-4">
          {leader ? <ScoreBreakdown stat={leader.stat} view={view} /> : null}

          <div className="card p-5">
            <h3 className="display text-base text-ink">How this board is built</h3>
            <ol className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-slate-600">
              <li>1. Start with every visible tool in {categoryName(useCase.category)}.</li>
              <li>
                2. Move tools up when their own listing mentions this job — {matchedCount} of {stats.length} do.
              </li>
              <li>3. Order the shortlist by the same weighted score used everywhere else.</li>
              <li>4. If too few tools mention it, the rest of the category fills the page instead of hiding the gap.</li>
            </ol>
            <p className="mt-3 border-t border-line/70 pt-2.5 text-[11px] leading-relaxed text-muted">
              No vendor benchmark is republished as our own test. Vendor numbers stay labelled as vendor numbers.
            </p>
          </div>

          <div className="card p-5">
            <h3 className="display text-base text-ink">Related rankings</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/ranking/${item.slug}`}
                  className="chip border border-line bg-white text-slate-600 transition hover:border-indigo-200 hover:text-brand"
                >
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-12">
        <SectionHead
          eyebrow="Go deeper"
          title="Compare the shortlist"
          subtitle="Open a full review, price out the plans, or run two tools head to head."
          action={
            <Link href={`/compare`} className="btn btn-ghost !py-2 text-xs">
              Open compare builder →
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.slice(0, 4).map((stat) => (
            <AiCard key={stat.ai.id} stat={stat} saved={saved.has(stat.ai.id)} back={`/ranking/${useCase.slug}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
