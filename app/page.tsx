import Link from "next/link";
import type { CSSProperties } from "react";
import AdSlot from "@/components/AdSlot";
import AiCard from "@/components/AiCard";
import AnimatedStats, { type HomeStat } from "@/components/AnimatedStats";
import AppShowcase, { type AppShowcaseItem } from "@/components/AppShowcase";
import BrandLogo from "@/components/BrandLogo";
import ChampionPodium, { type ChampionCategory } from "@/components/ChampionPodium";
import FeatureRotator from "@/components/FeatureRotator";
import HeroSearch from "@/components/HeroSearch";
import PaidPromo, { type PromoItem } from "@/components/PaidPromo";
import { formatMoney } from "@/lib/analytics";
import PostCard from "@/components/PostCard";
import RankTabs, { type RankRow, type RankTab } from "@/components/RankTabs";
import { SectionHead } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { getSiteSettings } from "@/lib/settings";
import { appPricingFor, formatPlanPrice } from "@/lib/plans";
import { APP_ENTRIES, DESKTOP_GROUPS, MOBILE_GROUPS } from "@/lib/software";
import {
  buildView,
  championFor,
  publishedPosts,
  rankedAis,
  risingAis,
  trendingAis,
  type AiStat,
} from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const CATEGORY_TINTS = [
  "#8b6cff",
  "#3fd8e6",
  "#f472b6",
  "#f4c95d",
  "#4ade80",
  "#60a5fa",
  "#fb923c",
  "#a78bfa",
  "#22d3ee",
  "#facc15",
  "#34d399",
  "#f87171",
  "#818cf8",
  "#e879f9",
  "#2dd4bf",
];

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pricingReport?: string }>;
}) {
  const { pricingReport } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const settings = getSiteSettings(db);
  const view = buildView(db);
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);
  const categories = getCategories(db);
  const posts = [...publishedPosts(db)]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 6);
  const trending = trendingAis(view, 4, settings.trendingAiIds);
  const rising = risingAis(view, 4);

  const bySlug = new Map([...view.aiStats.values()].map((s) => [s.ai.slug, s]));

  const paidPicks: PromoItem[] = [...view.aiStats.values()]
    .filter((s) => s.ai.priceType === "paid")
    .sort((a, b) => b.score - a.score || b.votes - a.votes)
    .slice(0, 3)
    .map((s) => ({
      slug: s.ai.slug,
      name: s.ai.name,
      logo: s.ai.logo,
      color: s.ai.color,
      score: s.score,
      votes: s.votes,
      planPrice: s.ai.planPrice,
      priceLabel: formatMoney(s.ai, settings.appearance),
      category: categoryName(s.ai.category),
      bestFor: s.ai.bestFor.join(" · "),
      website: s.ai.website,
    }));

  const hiddenApps = new Set(settings.hiddenAppSlugs ?? []);
  const appItems = APP_ENTRIES.filter((entry) => !hiddenApps.has(entry.slug)).map((entry): AppShowcaseItem => {
    const stat = entry.aiSlug ? bySlug.get(entry.aiSlug) : undefined;
    const pricing = appPricingFor(db, entry, stat?.ai);
    return {
      slug: entry.slug,
      name: entry.name,
      group: entry.group,
      logo: stat?.ai.logo ?? entry.emoji,
      color: stat?.ai.color ?? entry.color,
      score: stat?.score,
      price: stat?.ai.priceType ?? entry.price,
      platforms: entry.platforms,
      note: entry.note,
      href: stat ? `/ai/${stat.ai.slug}` : entry.website,
      external: !stat,
      iconSrc: stat ? `/logos/${stat.ai.slug}.png` : `/app-icons/${entry.slug}.png`,
      kind: entry.kind,
      plans: pricing.plans.map((plan) => ({
        name: plan.name,
        price: formatPlanPrice(plan, settings.appearance),
        note: plan.note,
      })),
      apiNote: [pricing.apiFrom, pricing.apiNote].filter(Boolean).join(" · ") || null,
    };
  });
  const mobileApps = appItems.filter((item) => item.kind === "mobile");
  const desktopApps = appItems.filter((item) => item.kind === "desktop");

  const tabs: RankTab[] = [
    { slug: "all", label: "All", rows: toRows(rankedAis(view).slice(0, 5)) },
    ...categories.map((c) => ({
      slug: c.slug,
      label: c.name,
      rows: toRows(rankedAis(view, c.slug).slice(0, 5)),
    })),
  ];

  const champions: ChampionCategory[] = categories.map((category) => ({
    slug: category.slug,
    label: category.name,
    emoji: category.emoji,
    rows: championFor(view, category.slug, settings.championOverrides)
      .slice(0, 3)
      .map((s, i) => ({
        rank: i + 1,
        slug: s.ai.slug,
        name: s.ai.name,
        logo: s.ai.logo,
        color: s.ai.color,
        score: s.score,
        votes: s.votes,
        priceType: s.ai.priceType,
        bestFor: s.ai.bestFor.slice(0, 2).join(" · "),
      })),
  })).filter((category) => category.rows.length >= 3);

  const stats: HomeStat[] = [
    { label: "AI tools", value: db.ai.length, icon: "tools", gradient: "#4f46e5", hint: "Every major category" },
    { label: "Models compared", value: db.models.length, icon: "models", gradient: "#7c3aed", hint: "Rated one by one" },
    {
      label: "Real ratings",
      value: db.ratings.length,
      icon: "ratings",
      gradient: "#0891b2",
      hint: "From signed-in users",
    },
    { label: "Expert guides", value: publishedPosts(db).length, icon: "guides", gradient: "#059669", hint: "No hype, just tests" },
  ];

  const categoryCounts = new Map<string, number>();
  for (const ai of db.ai) categoryCounts.set(ai.category, (categoryCounts.get(ai.category) ?? 0) + 1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GigleNode top-rated AI tools",
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
          image: `https://giglenode.com/logos/${s.ai.slug}.png`,
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

      {pricingReport === "sent" ? (
        <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            Pricing report sent. It will appear in the admin panel for review and the price will be checked and fixed.
          </div>
        </div>
      ) : null}
      {pricingReport === "short" ? (
        <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            Please enter at least 5 characters for the report.
          </div>
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative pt-3 sm:pt-5">
        <div className="relative overflow-hidden bg-[#07070d]">
          <div className="hero-blobs absolute inset-0" aria-hidden>
            <span className="hero-blob-1" />
            <span className="hero-blob-2" />
            <span className="hero-blob-3" />
          </div>
          <div className="hero-grid absolute inset-0" aria-hidden />

          <div className="relative mx-auto max-w-6xl px-4 pb-4 pt-8 sm:px-8 sm:pb-8 sm:pt-12 lg:px-10 lg:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="anim-rise chip border border-white/10 bg-white/[0.06] text-slate-300 backdrop-blur">
                  <span className="live-dot" aria-hidden /> Independent directory · updated live
                </span>
                <span className="anim-rise chip border border-white/10 bg-white/[0.03] text-slate-400">
                  No paid ranking
                </span>
              </div>

              <div className="anim-rise delay-1 mt-7 flex justify-center">
                <span className="relative block w-fit">
                  <span
                    className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500/35 via-fuchsia-500/20 to-cyan-400/30 blur-xl"
                    aria-hidden
                  />
                  <BrandLogo size={58} className="anim-float relative shadow-2xl shadow-violet-950/60" />
                </span>
              </div>

              <h1 className="anim-rise delay-1 mt-5">
                <span className="sr-only">GigleNode — </span>
                <span className="display block text-[clamp(2.45rem,6.4vw,4.65rem)] leading-[1.02] tracking-[-0.045em] text-white">
                  {settings.heroTitle} <span className="hero-gradient">{settings.heroHighlight}</span> {settings.heroSuffix}
                </span>
              </h1>

              <div className="anim-rise delay-2">
                <FeatureRotator />
              </div>

              <p className="anim-rise delay-3 mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400 sm:text-[15px]">
                {settings.heroSubtitle ||
                  "Video, images, code or writing — compare models, read honest reviews from verified users and choose with confidence."}
              </p>

              <div className="anim-rise delay-3">
                <HeroSearch />
              </div>

              <div className="anim-fade delay-4 mt-4 flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: "🎬 Video", href: "/category/video" },
                  { label: "🖼️ Image", href: "/category/image" },
                  { label: "⌨️ Coding", href: "/category/coding" },
                  { label: "✍️ Writing", href: "/category/writing" },
                  { label: "🎙️ Voice", href: "/category/voice" },
                ].map((b) => (
                  <Link
                    key={b.href}
                    href={b.href}
                    className="chip border border-white/10 bg-white/[0.05] px-3 py-1.5 text-slate-300 backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-400/60 hover:bg-violet-400/10 hover:text-white"
                  >
                    {b.label}
                  </Link>
                ))}
                <Link
                  href="/finder"
                  className="chip border border-transparent bg-[linear-gradient(100deg,#8b6cff,#3fd8e6)] px-3 py-1.5 font-semibold text-[#07070d] transition hover:-translate-y-0.5"
                >
                  ⚡ 30-second AI finder
                </Link>
              </div>
            </div>

            <AnimatedStats stats={stats} />
          </div>
        </div>
      </section>

      {settings.adsEnabled && settings.adsClientId && settings.adsTopSlot ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <AdSlot clientId={settings.adsClientId} slotId={settings.adsTopSlot} />
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-14 px-4 pb-6 pt-12 sm:px-6 sm:pt-14 lg:space-y-16">
        {/* Category champions */}
        <section id="champions">
          <SectionHead
            eyebrow="Top 3 by category"
            title="Category champions"
            subtitle="The three highest-rated AI tools in every category, ranked from real user votes and recency."
            action={
              <span className="chip border border-line bg-white text-slate-500">
                <span className="live-dot" aria-hidden /> Live scores
              </span>
            }
          />
          <div className="card overflow-hidden p-4 sm:p-6">
            <ChampionPodium categories={champions} />
          </div>
        </section>

        {/* Overall ranking */}
        <section id="ranking">
          <SectionHead
            eyebrow="Leaderboard"
            title="Top AI ranking"
            subtitle="A weighted score keeps low-vote tools honest: a 5.0 from 3 votes never outranks a 4.7 from 500."
            action={
              <Link href="/category/all" className="text-sm font-semibold text-brand transition hover:text-brand-dark">
                Full leaderboard →
              </Link>
            }
          />
          <div className="card p-4 sm:p-5">
            <RankTabs tabs={tabs} />
          </div>
        </section>

        {/* Paid promotions */}
        {settings.showPromotions ? (
          <section id="promotions" className="relative left-1/2 w-screen -translate-x-1/2">
            <PaidPromo items={paidPicks} />
          </section>
        ) : null}

        {/* Trending */}
        <section>
          <SectionHead
            eyebrow="This week"
            title="Trending AI tools"
            subtitle="The tools with the most visits and fresh ratings over the last seven days."
            action={
              <Link href="/category/all" className="btn btn-ghost !py-2 text-xs">
                Explore all AI
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((s, i) => (
              <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} badge={`#${i + 1} Trending`} />
            ))}
          </div>
        </section>

        {/* Mobile & desktop */}
        <section id="apps">
          <SectionHead
            eyebrow="Anywhere you work"
            title="AI apps & desktop software"
            subtitle={`${mobileApps.length} mobile apps and ${desktopApps.length} desktop tools, grouped by job — with official icons and pricing.`}
            action={
              <Link href="/category/all" className="text-sm font-semibold text-brand transition hover:text-brand-dark">
                Browse all AI →
              </Link>
            }
          />
          <AppShowcase
            mobile={mobileApps}
            desktop={desktopApps}
            mobileGroups={MOBILE_GROUPS}
            desktopGroups={DESKTOP_GROUPS}
          />
        </section>

        {/* New & rising */}
        {rising.length ? (
          <section>
            <SectionHead
              eyebrow="Fresh picks"
              title="New & rising"
              subtitle="Recently launched tools earning strong ratings without a big vote count yet."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rising.map((s) => (
                <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Guides */}
        <section>
          <SectionHead
            eyebrow="Editorial"
            title="Latest guides & comparisons"
            subtitle="Practical walkthroughs, honest comparisons and the top lists worth your time."
            action={
              <Link href="/blog" className="btn btn-ghost !py-2 text-xs">
                All guides
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Finder CTA */}
        <section className="relative left-1/2 w-screen -translate-x-1/2">
          <div className="dark-panel relative overflow-hidden rounded-none p-6 sm:p-10">
            <div className="aurora opacity-40" aria-hidden />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="chip border border-white/15 bg-white/10 text-cyan-200">AI Finder</span>
                <h2 className="display mt-3 text-2xl leading-tight text-white sm:text-3xl">
                  Not sure where to start?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Answer three quick questions about your task, budget and experience level. You will get the three
                  best tools for you — with live ratings attached.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/finder" className="btn bg-white text-ink hover:bg-slate-100">
                  Take the 30-second quiz →
                </Link>
                <Link
                  href="/compare"
                  className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  Compare tools
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <SectionHead
            eyebrow="Browse"
            title="Browse by category"
            subtitle="Pick the job you need done — every category has a live top-three and a full leaderboard."
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c, i) => {
              const tint = CATEGORY_TINTS[i % CATEGORY_TINTS.length];
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="card card-hover category-tile group relative flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-2xl p-4 text-center sm:min-h-[162px]"
                  style={{ "--tint": tint } as CSSProperties}
                >
                  <span className="category-glow" style={{ background: tint }} aria-hidden />
                  <span
                    aria-hidden
                    className="absolute right-3 top-3 text-xs text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                  >
                    ↗
                  </span>
                  <span
                    className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-xl shadow-sm"
                    style={{ borderColor: `${tint}55`, background: `${tint}18` }}
                  >
                    {c.emoji}
                  </span>
                  <span className="relative mt-3 block min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                    <span className="mt-1 block text-[11px] font-medium text-muted">
                      {categoryCounts.get(c.slug) ?? 0} tools
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
