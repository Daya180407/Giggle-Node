import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import AiCard from "@/components/AiCard";
import AnimatedStats, { type HomeStat } from "@/components/AnimatedStats";
import AppShowcase, { type AppShowcaseItem } from "@/components/AppShowcase";
import ChampionPodium, { type ChampionCategory, type ChampionRow } from "@/components/ChampionPodium";
import FeatureRotator from "@/components/FeatureRotator";
import HeroSearch from "@/components/HeroSearch";
import PaidPromo, { type PromoItem } from "@/components/PaidPromo";
import { formatMoney } from "@/lib/analytics";
import PostCard from "@/components/PostCard";
import RankTabs, { type RankRow, type RankTab } from "@/components/RankTabs";
import { SectionHead } from "@/components/ui";
import { movers } from "@/lib/insight";
import { USE_CASES } from "@/lib/usecases";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { communityTotals } from "@/lib/community-chat";
import { getSiteSettings } from "@/lib/settings";
import { appPricingFor, formatPlanPrice } from "@/lib/plans";
import { activeSponsorPlacements, isAiSponsored, slotMeta } from "@/lib/sponsors";
import { allApps, DESKTOP_GROUPS, MOBILE_GROUPS } from "@/lib/software";
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
    sponsored: isAiSponsored(s.ai),
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
  const communityStats = communityTotals(db);
  const posts = [...publishedPosts(db)]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 6);
  const trending = trendingAis(view, 4, settings.trendingAiIds);
  const rising = risingAis(view, 4);
  const momentum = movers(view, 4);
  const leaders = rankedAis(view).slice(0, 3);

  const bySlug = new Map([...view.aiStats.values()].map((s) => [s.ai.slug, s]));
  const sponsorRows = activeSponsorPlacements(db);

  const paidPicks: PromoItem[] = [...view.aiStats.values()]
    .filter((s) => !s.ai.hidden && s.ai.priceType === "paid")
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
  const appItems = allApps(db.customApps)
    .filter((entry) => !hiddenApps.has(entry.slug))
    .map((entry): AppShowcaseItem => {
    const found = entry.aiSlug ? bySlug.get(entry.aiSlug) : undefined;
    const stat = found && !found.ai.hidden ? found : undefined;
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
      href: stat ? `/ai/${stat.ai.slug}` : entry.affiliateUrl ?? entry.website,
      external: !stat,
      affiliate: Boolean(!stat && entry.affiliateUrl),
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
  const sponsoredApps = sponsorRows
    .filter((placement) => placement.targetType === "app" && placement.slot !== "top3")
    .flatMap((placement) => {
      const item = appItems.find(
        (entry) => entry.slug === placement.targetId && entry.kind === placement.listKey,
      );
      const slot = slotMeta(placement.slot);
      return item && slot ? [{ position: slot.position, placement, item }] : [];
    });

  const tabs: RankTab[] = [
    { slug: "all", label: "All", rows: toRows(rankedAis(view).slice(0, 5)) },
    ...categories.map((c) => ({
      slug: c.slug,
      label: c.name,
      rows: toRows(rankedAis(view, c.slug).slice(0, 5)),
    })),
  ];

  const champions: ChampionCategory[] = categories
    .map((category) => {
      const ranked = rankedAis(view, category.slug);
      const rows: ChampionRow[] = championFor(view, category.slug, settings.championOverrides)
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
        }));
      // Paid top-three card: inserted after the champion, never given a podium rank.
      const top3 = sponsorRows.find(
        (row) => row.targetType === "ai" && row.listKey === category.slug && row.slot === "top3",
      );
      const sponsoredStat = top3 ? ranked.find((s) => s.ai.id === top3.targetId) : undefined;
      if (sponsoredStat) {
        rows.splice(1, 0, {
          rank: ranked.findIndex((s) => s.ai.id === sponsoredStat.ai.id) + 1,
          slug: sponsoredStat.ai.slug,
          name: sponsoredStat.ai.name,
          logo: sponsoredStat.ai.logo,
          color: sponsoredStat.ai.color,
          score: sponsoredStat.score,
          votes: sponsoredStat.votes,
          priceType: sponsoredStat.ai.priceType,
          bestFor: sponsoredStat.ai.bestFor.slice(0, 2).join(" · "),
          sponsored: true,
          sponsorId: top3?.id,
        });
      }
      return { slug: category.slug, label: category.name, emoji: category.emoji, rows };
    })
    .filter((category) => category.rows.filter((row) => !row.sponsored).length >= 3);

  const stats: HomeStat[] = [
    {
      label: "AI tools",
      value: db.ai.filter((ai) => !ai.hidden).length,
      icon: "tools",
      gradient: "#4f46e5",
      hint: "Every major category",
    },
    { label: "Models compared", value: db.models.length, icon: "models", gradient: "#7c3aed", hint: "Rated one by one" },
    {
      label: "Real ratings",
      value: db.ratings.filter((r) => r.status !== "pending" && r.status !== "rejected").length,
      icon: "ratings",
      gradient: "#0891b2",
      hint: "From signed-in users",
    },
    { label: "Expert guides", value: publishedPosts(db).length, icon: "guides", gradient: "#059669", hint: "No hype, just tests" },
  ];

  const categoryCounts = new Map<string, number>();
  for (const ai of db.ai) {
    if (ai.hidden) continue;
    categoryCounts.set(ai.category, (categoryCounts.get(ai.category) ?? 0) + 1);
  }

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
          // Only tools with real votes carry a rating in structured data.
          ...(s.votes > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: Number(s.score.toFixed(1)),
                  ratingCount: s.votes,
                  bestRating: 5,
                },
              }
            : {}),
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
        <div className="lab-hero">
          <div className="lab-grid" aria-hidden />
          <div className="hero-blobs absolute inset-0" aria-hidden>
            <span className="hero-blob-1" />
            <span className="hero-blob-2" />
            <span className="hero-blob-3" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-8 sm:pb-8 sm:pt-12 lg:px-10 lg:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="anim-rise chip border border-white/10 bg-white/[0.06] text-slate-300 backdrop-blur">
                  <span className="live-dot" aria-hidden /> Independent directory · updated live
                </span>
                <span className="anim-rise chip border border-white/10 bg-white/[0.03] text-slate-400">
                  No paid ranking
                </span>
              </div>

              <h1 className="anim-rise delay-1 mt-7">
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

            </div>

            <AnimatedStats stats={stats} />

            <div className="anim-fade delay-4 mx-auto mt-6">
              <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Top rated now</span>
                {leaders.map((s, i) => (
                  <Link
                    key={s.ai.id}
                    href={`/ai/${s.ai.slug}`}
                    className="chip border border-white/10 bg-white/[0.05] text-slate-300 transition hover:-translate-y-0.5 hover:border-violet-400/60 hover:text-white"
                  >
                    <span className="text-slate-500">#{i + 1}</span> {s.ai.name}
                    <span className="font-bold text-amber-300">{s.votes > 0 ? `★ ${s.score.toFixed(1)}` : "New"}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pick a board: arena, task rankings, value */}
      <section className="board-deck surface-band mt-5 bg-white sm:mt-7">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Three ways in</p>
              <h2 className="display mt-1.5 text-[21px] leading-tight text-ink sm:text-[26px]">
                Start with a vote, a task or a budget
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                The leaderboard is one view. These boards answer what it cannot: which tool wins with the names
                hidden, which one suits your exact job, and what each rating point actually costs.
              </p>
            </div>
            <Link href="/ranking" className="btn btn-ghost shrink-0 self-start !py-2 text-xs sm:self-auto">
              All boards →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                href: "/arena",
                cls: "board-card-arena",
                icon: "⚔️",
                title: "Blind arena",
                body: "Two tools, names hidden. Pick the one you would actually use, then see who won.",
                meta: "Community picks",
              },
              {
                href: "/ranking",
                cls: "board-card-rank",
                icon: "🎯",
                title: "Ranked by task",
                body: `${USE_CASES.length} boards for real jobs — blog posts, code review, thumbnails, research.`,
                meta: "Task-first",
              },
              {
                href: "/value",
                cls: "board-card-value",
                icon: "💸",
                title: "Best value",
                body: "Live score divided by the cheapest plan, with genuinely free tools kept separate.",
                meta: "Score per rupee",
              },
            ].map((card, i) => (
              <Link key={card.href} href={card.href} className={`board-card group bg-white ${card.cls}`}>
                <span className="board-rail" aria-hidden />
                <span className="flex items-start justify-between gap-2">
                  <span className="board-icon" aria-hidden>
                    {card.icon}
                  </span>
                  <span className="board-index" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mt-3 block text-[15px] font-bold text-ink">{card.title}</span>
                <span className="mt-1 block flex-1 text-[12.5px] leading-relaxed text-slate-500">{card.body}</span>
                <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{card.meta}</span>
                  <span className="text-xs font-semibold text-brand transition group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community entry point */}
      <section className="mx-auto mt-4 max-w-7xl px-4 sm:mt-5 sm:px-6">
        <Link
          href="/community"
          className="card card-hover flex flex-col gap-3 border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#075e54] text-2xl shadow-md shadow-emerald-900/25">
              💬
            </span>
            <span className="min-w-0">
              <span className="eyebrow">Community</span>
              <span className="mt-1 block text-base font-bold text-ink">Talk to other AI users</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                {communityStats.members.toLocaleString("en-IN")} members ·{" "}
                {communityStats.messages.toLocaleString("en-IN")} messages · a free room for every AI tool.
              </span>
            </span>
          </span>
          <span className="btn btn-primary shrink-0">Open community →</span>
        </Link>
      </section>

      {settings.adsEnabled && settings.adsClientId && settings.adsTopSlot ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <AdSlot clientId={settings.adsClientId} slotId={settings.adsTopSlot} />
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-14">
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
          <div className="pt-1">
            <ChampionPodium categories={champions} />
          </div>
        </section>
      </div>

      {/* Overall ranking — a full-bleed band, so the section has no side margins */}
      <section id="ranking" className="surface-band mt-12 bg-white sm:mt-14">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
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
          <RankTabs tabs={tabs} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-14">
        {/* New boards */}
        <section className="grid gap-3 lg:grid-cols-2">
          <Link
            href="/arena"
            className="lab-panel group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-indigo-200"
          >
            <span
              aria-hidden
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-200/40 blur-2xl transition group-hover:bg-indigo-300/50"
            />
            <p className="eyebrow relative">Community signal</p>
            <h2 className="display relative mt-2 text-xl text-ink">Vote blind. See what actually wins.</h2>
            <p className="relative mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-600">
              Two tools, no logos and no scores until you pick. Arena wins stay separate from the weighted
              leaderboard, so a popular favourite never quietly rewrites the ranking.
            </p>
            <span className="relative mt-3 inline-flex text-xs font-semibold text-brand">Enter the arena →</span>
          </Link>
          <Link
            href="/value"
            className="lab-panel group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-emerald-200"
          >
            <span
              aria-hidden
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl transition group-hover:bg-emerald-300/50"
            />
            <p className="eyebrow relative">Money board</p>
            <h2 className="display relative mt-2 text-xl text-ink">The most rating per rupee.</h2>
            <p className="relative mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-600">
              A 4.9★ tool at $30 is not better value than a 4.8★ tool at $10. The value board divides the live score by
              the cheapest monthly plan and lists free tools on their own shelf.
            </p>
            <span className="relative mt-3 inline-flex text-xs font-semibold text-brand">Open the value board →</span>
          </Link>
        </section>
      </div>

      {/* Paid promotions */}
      {settings.showPromotions ? (
        <section id="promotions" className="pt-14 lg:pt-16">
          <PaidPromo items={paidPicks} />
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="space-y-14 pt-14 lg:space-y-16 lg:pt-16">

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

        {/* Momentum */}
        {momentum.length ? (
          <section>
            <SectionHead
              eyebrow="This week"
              title="Rank movers"
              subtitle="Real ratings from the last seven days, not a paid push. When the week is quiet, recent drift takes the shelf instead."
              action={
                <Link href="/ranking" className="text-sm font-semibold text-brand transition hover:text-brand-dark">
                  Why they moved →
                </Link>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {momentum.map((row) => (
                <AiCard
                  key={row.stat.ai.id}
                  stat={row.stat}
                  saved={saved.has(row.stat.ai.id)}
                  badge={row.votes7 > 0 ? `${row.votes7} new this week` : "recent drift"}
                />
              ))}
            </div>
          </section>
        ) : null}

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
            sponsored={sponsoredApps}
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

        </div>
      </div>

      {/* Finder CTA */}
      <section className="relative pt-14 lg:pt-16">
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

      <div className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:pt-16">
        {/* Categories */}
        <section>
          <SectionHead
            eyebrow="Browse"
            title="Browse by category"
            subtitle="Pick the job you need done — every category has a live top-three and a full leaderboard."
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="card card-hover group flex min-h-[122px] flex-col justify-between rounded-2xl p-4 sm:min-h-[132px]"
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-base"
                  >
                    {c.emoji}
                  </span>
                  <span
                    aria-hidden
                    className="text-xs text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                  >
                    ↗
                  </span>
                </span>
                <span className="mt-3 block min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{c.name}</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-muted">
                    {categoryCounts.get(c.slug) ?? 0} tools
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
