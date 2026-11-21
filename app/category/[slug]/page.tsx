import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import CostCalculator from "@/components/CostCalculator";
import PostCard from "@/components/PostCard";
import RankingTable from "@/components/RankingTable";
import { SectionHead } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { buildView, publishedPosts, rankedAis, risingAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORY_MAP[slug];
  const title = cat ? `Best ${cat.name} AI Tools (2026) — Real User Rating` : "Saare AI Tools Ki Ranking";
  const description = cat
    ? `${cat.blurb} ${cat.name} category ke best AI tools ki real user rating ke saath ranking, price aur model detail.`
    : "GigleNode pe saare AI tools ki weighted ranking — real user ratings, price aur model wise detail ke saath.";
  return { title, description, alternates: { canonical: `/category/${slug}` } };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  if (slug !== "all" && !CATEGORY_MAP[slug]) notFound();

  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const cat = CATEGORY_MAP[slug];
  const stats = rankedAis(view, slug === "all" ? "all" : (slug as CategorySlug));
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/category/all" className="hover:text-brand">
          Categories
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{cat?.name ?? "All"}</span>
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {cat ? `Best ${cat.name} AI Tools` : "Saare AI Tools Ki Ranking"}{" "}
          <span className="text-muted">(2026)</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {cat?.blurb ?? "GigleNode pe listed saare AI tools, weighted score ke hisab se ranked."}{" "}
          {stats.length} tools · {totalVotes.toLocaleString("en-IN")} real votes.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Top Rated Ranking</h2>
            <span className="chip bg-brand-soft text-brand">Weighted + recency</span>
          </div>
          <RankingTable stats={stats} />
        </section>

        <aside className="space-y-4">
          <CostCalculator
            categoryLabel={cat?.name ?? "AI"}
            unitLabel={cat?.unit.label ?? "tasks / month"}
            defaultQty={cat?.unit.defaultQty ?? 50}
            options={calcOptions}
          />
          <div className="card p-4">
            <h3 className="text-sm font-bold">Category ke baare me</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{cat?.blurb}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => c.slug !== slug)
                .slice(0, 6)
                .map((c) => (
                  <Link key={c.slug} href={`/category/${c.slug}`} className="chip border border-line text-slate-600">
                    {c.emoji} {c.name}
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      </div>

      {rising.length ? (
        <section className="mt-10">
          <SectionHead title="New & Rising" subtitle="Naye AI, kam votes, high rating." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rising.map((s) => (
              <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back={`/category/${slug}`} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedPosts.length ? (
        <section className="mt-10">
          <SectionHead
            title="Is Category Ke Posts"
            action={
              <Link href="/blog" className="text-sm font-semibold text-brand">
                Saare posts →
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
