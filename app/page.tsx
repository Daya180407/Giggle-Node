import Link from "next/link";
import AiCard from "@/components/AiCard";
import RankTabs, { type RankRow, type RankTab } from "@/components/RankTabs";
import PostCard from "@/components/PostCard";
import { SectionHead } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { buildView, publishedPosts, rankedAis, risingAis, trendingAis, type AiStat } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function toRows(stats: AiStat[]): RankRow[] {
  return stats.map((s, i) => ({
    rank: i + 1,
    id: s.ai.id,
    slug: s.ai.slug,
    name: s.ai.name,
    logo: s.ai.logo,
    color: s.ai.color,
    score: s.score,
    votes: s.votes,
    priceType: s.ai.priceType,
    trend: s.trend,
    sponsored: s.ai.sponsored,
    website: s.ai.website,
    bestFor: s.ai.bestFor.slice(0, 2).join(" · "),
  }));
}

export default async function HomePage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);
  const posts = publishedPosts(db).slice(0, 6);
  const trending = trendingAis(view, 4);
  const rising = risingAis(view, 4);

  const tabs: RankTab[] = [
    { slug: "all", label: "All", rows: toRows(rankedAis(view).slice(0, 5)) },
    ...CATEGORIES.map((c) => ({
      slug: c.slug,
      label: c.name,
      rows: toRows(rankedAis(view, c.slug).slice(0, 5)),
    })),
  ];

  const stats = [
    { label: "AI Tools", value: db.ai.length },
    { label: "Models", value: db.models.length },
    { label: "Real Ratings", value: db.ratings.length.toLocaleString("en-IN") },
    { label: "Expert Posts", value: publishedPosts(db).length },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GigleNode Top Rated AI",
    itemListElement: rankedAis(view)
      .slice(0, 10)
      .map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SoftwareApplication",
          name: s.ai.name,
          applicationCategory: `${s.ai.category}Application`,
          url: `https://giglenode.com/ai/${s.ai.slug}`,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(s.score.toFixed(1)),
            ratingCount: s.votes,
            bestRating: 5,
          },
        },
      })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-b from-indigo-50 via-white to-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <span className="chip border border-indigo-100 bg-white text-brand">✨ Real user ratings · Koi paid ranking nahi</span>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            Har Kaam Ke Liye <span className="text-brand">Best AI</span>, Real User Rating Ke Saath
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Video, photo, coding ya writing — confusion khatam. Model wise detail, honest comparison aur expert posts,
            sab ek jagah.
          </p>

          <form action="/search" className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                name="q"
                type="search"
                placeholder='Try: "ChatGPT", "YouTube ke liye", "coding"'
                className="field !py-3 pl-9 text-sm"
                aria-label="Search AI"
              />
            </div>
            <button className="btn btn-primary !px-5">Search</button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "🎬 Video AI", href: "/category/video" },
              { label: "🖼️ Photo AI", href: "/category/image" },
              { label: "⌨️ Coding AI", href: "/category/coding" },
              { label: "✍️ Writing AI", href: "/category/writing" },
            ].map((b) => (
              <Link key={b.href} href={b.href} className="btn btn-ghost !py-1.5 text-xs">
                {b.label}
              </Link>
            ))}
          </div>

          <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className="text-lg font-extrabold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {/* Ranking */}
        <section id="ranking">
          <SectionHead
            title="Top AI Ranking"
            subtitle="Weighted score — kam votes wala 5.0 star, zyada votes wale 4.7 star se upar nahi ja sakta."
            action={
              <span className="chip bg-white text-slate-500 ring-1 ring-line">Roz raat 12 baje update</span>
            }
          />
          <div className="card p-4 sm:p-5">
            <RankTabs tabs={tabs} />
          </div>
        </section>

        {/* Trending */}
        <section>
          <SectionHead
            title="Trending This Week"
            subtitle="Pichle 7 din me sabse zyada visits aur nayi ratings wale AI."
            action={
              <Link href="/category/all" className="text-sm font-semibold text-brand">
                Saare AI →
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((s) => (
              <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} />
            ))}
          </div>
        </section>

        {/* New & Rising */}
        {rising.length ? (
          <section>
            <SectionHead
              title="New & Rising"
              subtitle="Naye AI jinke votes kam hain par rating 4.4 se upar hai."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rising.map((s) => (
                <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Latest posts */}
        <section>
          <SectionHead
            title="Latest Posts"
            subtitle="News, comparison, top 10 lists aur step-by-step tutorials."
            action={
              <Link href="/blog" className="btn btn-ghost">
                Saare Posts Dekhein
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Finder banner */}
        <section>
          <div className="card overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <h2 className="text-xl font-extrabold sm:text-2xl">Confused Hain? 30 Second Me Best AI Dhoondhiye</h2>
                <p className="mt-1 max-w-xl text-sm text-indigo-100">
                  3 simple sawal — kaam, budget aur level. Fir aapko top 3 AI milega, rating ke saath.
                </p>
              </div>
              <Link href="/finder" className="btn bg-white text-indigo-700 hover:bg-indigo-50">
                Quiz Shuru Kijiye →
              </Link>
            </div>
          </div>
        </section>

        {/* Categories grid */}
        <section>
          <SectionHead title="Categories" subtitle="Apna kaam chuniye, uske best AI dekhiye." />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="card card-hover flex items-center gap-2 p-3 text-sm font-medium"
              >
                <span className="text-lg">{c.emoji}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
