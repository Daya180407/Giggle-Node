import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import CostCalculator from "@/components/CostCalculator";
import PostCard from "@/components/PostCard";
import RankingTable from "@/components/RankingTable";
import { SectionHead } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { buildView, publishedPosts, rankedAis, risingAis } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { placementsFor } from "@/lib/sponsors";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategories(readDb()).find((c) => c.slug === slug);
  const title = cat ? `Best ${cat.name} AI Tools (2026) — Real User Ratings` : "All AI Tools Ranked";
  const description = cat
    ? `${cat.blurb} Compare the best ${cat.name.toLowerCase()} AI tools by real user ratings, pricing and model-level detail.`
    : "Every AI tool on GiggleNode, ranked by a transparent weighted score built from real user ratings.";
  return { title, description, alternates: { canonical: `/category/${slug}` } };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const categories = getCategories(db);
  const cat = categories.find((c) => c.slug === slug);
  if (slug !== "all" && !cat) notFound();
  const view = buildView(db);
  const settings = getSiteSettings(db);
  const stats = rankedAis(view, slug === "all" ? "all" : (slug as CategorySlug));
  // Paid rows for this exact list. Top-three podium bookings stay on the home page.
  const sponsors = (settings.sponsorsEnabled ? placementsFor(db, "ai", slug === "all" ? "all" : slug) : [])
    .filter((placement) => placement.slot !== "top3")
    .flatMap((placement) => {
      const stat = stats.find((s) => s.ai.id === placement.targetId);
      return stat ? [{ placement, stat }] : [];
    });
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);
  const rising = risingAis(view, 4);
  const relatedPosts = publishedPosts(db)
    .filter((p) => p.relatedAiIds.some((id) => stats.some((s) => s.ai.id === id)))
    .slice(0, 3);

  const calcOptions = stats.map((s) => ({
    slug: s.ai.slug,
    name: s.ai.name,
    logo: s.ai.logo,
    color: s.ai.color,
    priceType: s.ai.priceType,
    planPrice: s.ai.planPrice,
    unitCost: s.ai.unitCost,
    score: s.score,
  }));

  const totalVotes = stats.reduce((sum, s) => sum + s.votes, 0);
  const topScore = stats[0]?.score ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-brand">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/category/all" className="transition hover:text-brand">
          Categories
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-600">{cat?.name ?? "All tools"}</span>
      </nav>

      <header className="page-hero mt-3">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <span className="chip chip-brand">
              <span aria-hidden>{cat?.emoji ?? "🤖"}</span> {cat ? `${cat.name} AI` : "All categories"}
            </span>
            <h1 className="display mt-3 text-3xl leading-tight text-ink sm:text-4xl">
              {cat ? `Best ${cat.name} AI tools` : "All AI tools ranked"}{" "}
              <span className="text-slate-400">2026</span>
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              {cat?.blurb ?? "Every AI tool listed on GiggleNode, ordered by a transparent weighted score."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip border border-line bg-white/80 text-slate-600">
                {stats.length} tools ranked
              </span>
              <span className="chip border border-line bg-white/80 text-slate-600">
                {totalVotes.toLocaleString("en-US")} real votes
              </span>
              <span className="chip border border-line bg-white/80 text-slate-600">
                Top score {topScore.toFixed(1)} / 5
              </span>
            </div>
          </div>

          <div className="no-scrollbar -mx-1 flex w-full gap-1.5 overflow-x-auto px-1 sm:w-auto sm:max-w-md sm:flex-wrap lg:max-w-xs">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className={`chip shrink-0 border px-2.5 py-1.5 transition ${
                  c.slug === slug
                    ? "border-transparent bg-ink text-white"
                    : "border-line bg-white/80 text-slate-600 hover:border-indigo-200 hover:text-brand"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 p-4 sm:p-5" aria-labelledby="category-ranking">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="category-ranking" className="display text-lg text-ink">
                Live ranking
              </h2>
              <p className="text-xs text-muted">Updated as new ratings arrive.</p>
            </div>
            <span className="chip chip-brand">Weighted + recency</span>
          </div>
          <RankingTable stats={stats} sponsors={sponsors} />
        </section>

        <aside className="min-w-0 space-y-4">
          <CostCalculator
            categoryLabel={cat?.name ?? "AI"}
            unitLabel={cat?.unit.label ?? "tasks / month"}
            defaultQty={cat?.unit.defaultQty ?? 50}
            options={calcOptions}
          />
          <div className="card p-5">
            <h3 className="display text-base text-ink">About this category</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{cat?.blurb}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Prices are starting plans in USD. Usage-based costs are estimates — always check the official pricing
              page before subscribing.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {categories.filter((c) => c.slug !== slug)
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="chip border border-line bg-white text-slate-600 transition hover:border-indigo-200 hover:text-brand"
                  >
                    <span aria-hidden>{c.emoji}</span> {c.name}
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      </div>

      {rising.length ? (
        <section className="mt-12">
          <SectionHead eyebrow="Fresh picks" title="New & rising" subtitle="Recently launched tools with strong early ratings." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rising.map((s) => (
              <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back={`/category/${slug}`} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedPosts.length ? (
        <section className="mt-12">
          <SectionHead
            eyebrow="Editorial"
            title="Guides in this category"
            action={
              <Link href="/blog" className="text-sm font-semibold text-brand transition hover:text-brand-dark">
                All guides →
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
