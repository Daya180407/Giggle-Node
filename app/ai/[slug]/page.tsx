import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { toggleBookmarkAction, toggleFollowAction, togglePriceAlertAction } from "@/app/actions";
import AdSlot from "@/components/AdSlot";
import { ClaimListingForm, ReviewReplyForm } from "@/components/CommunityForms";
import ContributePanel from "@/components/ContributePanel";
import EmbedBadge from "@/components/EmbedBadge";
import RatingTrend from "@/components/RatingTrend";
import AiCard from "@/components/AiCard";
import AiQuickRate from "@/components/AiQuickRate";
import { ApiPricingInline } from "@/components/ApiPricing";
import CopyButton from "@/components/CopyButton";
import Distribution from "@/components/Distribution";
import PostCard from "@/components/PostCard";
import PricingReport from "@/components/PricingReport";
import PromptSubmitForm from "@/components/PromptSubmitForm";
import ShareButton from "@/components/ShareButton";
import { AiLogo, PriceBadge, SectionHead, SponsoredTag, Stars, Trend } from "@/components/ui";
import { formatMoney } from "@/lib/analytics";
import { getApiPricing } from "@/lib/api-pricing";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { canAccess, resolveRoles } from "@/lib/roles";
import { formatPlanPrice } from "@/lib/plans";
import { myPriceAlert, priceChange, priceHistoryFor, repliesFor, verifiedShare, weeklyRatingTrend } from "@/lib/community";
import { CONTRIBUTION_LABEL, myContributions } from "@/lib/contributions";
import { communityMessagesForRoom, UNIVERSAL_ROOM_SLUG } from "@/lib/community-chat";
import { reportRatingAction } from "@/app/actions";
import { aiReviews, buildView, isVerifiedPrompt, publishedPosts, promptsFor, timeAgo } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pricingReport?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai || ai.hidden) return { title: "AI not found" };
  const view = buildView(db);
  const stat = view.aiStats.get(ai.id)!;
  return {
    title: `${ai.name} Review, Rating & Models (2026)`,
    description: `${ai.name} — rated ${stat.score.toFixed(1)}/5 by ${stat.votes} users. Explore models, pricing, free alternatives, prompts and reviews.`,
    alternates: { canonical: `/ai/${ai.slug}` },
    openGraph: { title: `${ai.name} — GigleNode Rating`, description: ai.description.slice(0, 160) },
  };
}

export default async function AiDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pricingReport } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const ai = db.ai.find((a) => a.slug === slug);
  // A hidden listing is removed from the public site: its detail page must 404 too.
  if (!ai || ai.hidden) notFound();

  const view = buildView(db);
  const settings = getSiteSettings(db);
  const stat = view.aiStats.get(ai.id)!;
  const models = [...stat.models].sort((a, b) => b.score - a.score || b.votes - a.votes);
  const modelIds = new Set(models.map((m) => m.model.id));
  const myRatings = user
    ? db.ratings.filter((r) => r.userId === user.id && (modelIds.has(r.modelId ?? "") || r.aiId === ai.id))
    : [];
  const prompts = promptsFor(db, ai.id);
  const communityPosts = settings.community.enabled ? communityMessagesForRoom(db, ai.id, null).length : 0;
  const reviews = aiReviews(db, ai.id, 8);
  const posts = publishedPosts(db).filter((p) => p.relatedAiIds.includes(ai.id)).slice(0, 3);
  const bookmarked = Boolean(user && db.bookmarks.some((b) => b.userId === user.id && b.aiId === ai.id));
  const followed = Boolean(user && db.follows.some((f) => f.userId === user.id && f.aiId === ai.id));
  const followers = db.follows.filter((f) => f.aiId === ai.id).length;
  const verified = verifiedShare(db, ai.id);
  const trendPoints = weeklyRatingTrend(db, ai.id);
  const change = priceChange(db, ai.id);
  const history = priceHistoryFor(db, ai.id).slice(-6);
  const watching = user ? Boolean(myPriceAlert(db, user.id, ai.id)) : false;
  const replies = repliesFor(
    db,
    reviews.map((row) => row.rating.id),
  );
  const myRequests = user ? myContributions(db, user.id, ai.id).slice(0, 6) : [];
  const isClaimedVendor = Boolean(user && ai.claim && ai.claim.email.toLowerCase() === user.email.toLowerCase());
  const canReply = Boolean(isClaimedVendor || (user && canAccess(user.role, "ratings", resolveRoles(db.roles))));

  const freeAltStat = ai.freeAlternativeId ? view.aiStats.get(ai.freeAlternativeId) : undefined;
  const fallbackFree = [...view.aiStats.values()]
    .filter((s) => s.ai.category === ai.category && s.ai.id !== ai.id && s.ai.priceType !== "paid")
    .sort((a, b) => b.score - a.score)[0];
  const freeAlternative = freeAltStat ?? (ai.priceType !== "free" ? fallbackFree : undefined);
  const compareOpponent =
    (freeAlternative && freeAlternative.ai.id !== ai.id ? freeAlternative.ai : undefined) ??
    [...view.aiStats.values()]
      .filter((s) => !s.ai.hidden && s.ai.id !== ai.id)
      .sort((a, b) => b.score - a.score)[0]?.ai;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ai.name,
    applicationCategory: "AIApplication",
    operatingSystem: "Web",
    url: `https://giglenode.com/ai/${ai.slug}`,
    description: ai.description,
    image: `https://giglenode.com/logos/${ai.slug}.png`,
    sameAs: ai.website,
    mainEntityOfPage: `https://giglenode.com/ai/${ai.slug}`,
    offers: { "@type": "Offer", price: ai.priceType === "free" ? 0 : ai.planPrice, priceCurrency: "USD" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(stat.score.toFixed(1)),
      ratingCount: stat.votes,
      bestRating: 5,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://giglenode.com" },
      { "@type": "ListItem", position: 2, name: `${categoryName(ai.category)} AI`, item: `https://giglenode.com/category/${ai.category}` },
      { "@type": "ListItem", position: 3, name: ai.name, item: `https://giglenode.com/ai/${ai.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/category/${ai.category}`} className="hover:text-brand">
          {categoryName(ai.category)} AI
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{ai.name}</span>
      </nav>

      {pricingReport === "sent" ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Report sent. It will appear in the admin panel and the price will be checked and fixed.
        </div>
      ) : null}
      {pricingReport === "short" ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          Please enter at least 5 characters for the report.
        </div>
      ) : null}

      {/* Header */}
      <header className="page-hero mt-3">
        <div className="flex flex-wrap items-start gap-4">
          <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={78} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{ai.name}</h1>
              {ai.sponsored ? <SponsoredTag /> : null}
              {ai.featured ? <span className="chip bg-indigo-50 text-indigo-700">★ Featured</span> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Link href={`/category/${ai.category}`} className="chip bg-brand-soft text-brand">
                {categoryName(ai.category)}
              </Link>
              <PriceBadge price={ai.priceType} />
              <span className="chip bg-emerald-50 text-emerald-700">{formatMoney(ai, settings.appearance)}</span>
              {(ai.platforms ?? []).map((platform) => (
                <span key={platform} className="chip bg-slate-100 text-slate-600">
                  {platform === "web" ? "🌐 Website" : platform === "android" ? "📱 Android" : "💻 PC"}
                </span>
              ))}
              <span>{models.length} models</span>
              <span>·</span>
              <span>{followers} followers</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Stars value={stat.score} size={22} />
              <span className="text-lg font-bold">{stat.score.toFixed(1)}</span>
              <span className="text-sm text-muted">({stat.votes.toLocaleString("en-IN")} ratings)</span>
              <Trend trend={stat.trend} />
              <span
                className={`chip ${verified.percent >= 50 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                title="Ratings from users who opened this tool from GigleNode"
              >
                ✓ {verified.percent}% verified
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Overall rating · {stat.aiVotes} overall {stat.aiVotes === 1 ? "vote" : "votes"} + {stat.modelVotes} model{" "}
              {stat.modelVotes === 1 ? "vote" : "votes"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/go/${ai.slug}`}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="btn btn-primary"
          >
            Official Website ↗
          </a>
          <a href="#rate" className="btn btn-ghost">
            ★ Rate this AI
          </a>
          <form action={toggleBookmarkAction}>
            <input type="hidden" name="aiId" value={ai.id} />
            <input type="hidden" name="back" value={`/ai/${ai.slug}`} />
            <button className={`btn ${bookmarked ? "bg-brand-soft text-brand border border-indigo-200" : "btn-ghost"}`}>
              {bookmarked ? "🔖 Saved" : "🏷️ Bookmark"}
            </button>
          </form>
          <form action={toggleFollowAction}>
            <input type="hidden" name="aiId" value={ai.id} />
            <input type="hidden" name="back" value={`/ai/${ai.slug}`} />
            <button className={`btn ${followed ? "bg-brand-soft text-brand border border-indigo-200" : "btn-ghost"}`}>
              {followed ? "✓ Following" : "+ Follow"}
            </button>
          </form>
          <Link href={`/community/${ai.slug}`} className="btn btn-ghost">
            💬 Community
          </Link>
          <ShareButton title={`${ai.name} — GigleNode rating`} />
          {user && canAccess(user.role, "catalogue", resolveRoles(db.roles)) ? (
            <Link href={`/admin/ai/${ai.slug}`} className="btn btn-ghost">
              ✎ Admin edit
            </Link>
          ) : null}
        </div>

        {ai.sponsored ? (
          <p className="mt-3 border-l-2 border-line pl-3 text-xs leading-relaxed text-slate-500">
            Sponsored placement. This never changes the ranking formula
            {ai.boost > 0 ? ` (manual editor boost: +${ai.boost.toFixed(2)}).` : "."}
          </p>
        ) : null}
      </header>

      <div className="mt-4">
        <AiQuickRate
          aiId={ai.id}
          aiName={ai.name}
          aiSlug={ai.slug}
          models={models.map((m) => ({ id: m.model.id, name: m.model.name }))}
          existingRatings={myRatings}
          isLoggedIn={Boolean(user)}
          allowRatings={settings.allowRatings}
        />
      </div>

      {settings.community.enabled ? (
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-cyan-50/60 p-4">
          <div className="min-w-0">
            <p className="eyebrow">Community</p>
            <p className="mt-1 text-sm font-bold text-ink">Join the {ai.name} community</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {communityPosts > 0
                ? `${communityPosts} ${communityPosts === 1 ? "message" : "messages"} from members`
                : "Be the first to post"}{" "}
              · ask a question, share a fix or help another user. Free.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/community/${ai.slug}`} className="btn btn-primary !py-2 text-xs">
              💬 Join the community
            </Link>
            <Link href={`/community/${UNIVERSAL_ROOM_SLUG}`} className="btn btn-ghost !py-2 text-xs">
              Any-AI room →
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Models & API pricing */}
          <section className="card overflow-hidden" id="models">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
              <div>
                <h2 className="text-base font-bold">Model-by-model breakdown &amp; API pricing</h2>
                <p className="text-xs text-muted">
                  Each model is rated separately from the overall score. Compare model-level API rates too.
                </p>
              </div>
              <span className="chip chip-brand">{models.length} models · every model rated separately</span>
            </div>
            <div>
              {/* Phones: one stacked card per model — five columns cannot fit a phone screen. */}
              <ul className="divide-y divide-line sm:hidden">
                {models.map((m) => (
                  <li key={m.model.id} className="p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/ai/${ai.slug}/${m.model.slug}`}
                        className="min-w-0 font-semibold hover:text-brand"
                      >
                        {m.model.name}
                      </Link>
                      <PriceBadge price={m.model.priceType} />
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{m.model.bestFor}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Stars value={m.score} size={15} />
                      <span className="text-sm font-semibold">{m.score.toFixed(1)}</span>
                      <span className="text-[11px] text-muted">{m.votes} votes</span>
                    </div>
                    <div className="mt-2">
                      <ApiPricingInline pricing={getApiPricing(ai, m.model)} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Link
                        href={`/ai/${ai.slug}/${m.model.slug}#rate`}
                        className="btn btn-primary !px-2.5 !py-1 text-xs"
                      >
                        ★ Rate
                      </Link>
                      <Link
                        href={`/ai/${ai.slug}/${m.model.slug}`}
                        className="btn btn-ghost !px-2.5 !py-1 text-xs"
                      >
                        Details →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              <table
                className="hidden w-full table-fixed text-left text-xs sm:table sm:text-sm"
                aria-label="Models and API pricing"
              >
                <colgroup>
                  <col className="w-[19%]" />
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-2 py-2.5 font-semibold sm:px-4">Model</th>
                    <th className="px-2 py-2.5 font-semibold sm:px-4">Best for</th>
                    <th className="px-2 py-2.5 font-semibold sm:px-4">Rating</th>
                    <th className="px-2 py-2.5 font-semibold sm:px-4">API pricing</th>
                    <th className="px-2 py-2.5 sm:px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {models.map((m) => {
                    const pricing = getApiPricing(ai, m.model);
                    return (
                      <tr key={m.model.id} className="align-top transition hover:bg-slate-50/60">
                        <td className="px-2 py-2.5 sm:px-4">
                          <Link
                            href={`/ai/${ai.slug}/${m.model.slug}`}
                            className="font-semibold hover:text-brand"
                          >
                            {m.model.name}
                          </Link>
                          <div className="mt-1">
                            <PriceBadge price={m.model.priceType} />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-[12px] leading-relaxed text-slate-600 sm:px-4 sm:text-xs">
                          {m.model.bestFor}
                        </td>
                        <td className="px-2 py-2.5 sm:px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Stars value={m.score} size={15} />
                            <span className="text-sm font-semibold">{m.score.toFixed(1)}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">{m.votes} votes</p>
                        </td>
                        <td className="px-2 py-2.5 sm:px-4">
                          <ApiPricingInline pricing={pricing} />
                        </td>
                        <td className="px-2 py-2.5 text-right sm:px-4">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Link
                              href={`/ai/${ai.slug}/${m.model.slug}#rate`}
                              className="btn btn-primary !px-2.5 !py-1 text-xs"
                            >
                              ★ Rate
                            </Link>
                            <Link
                              href={`/ai/${ai.slug}/${m.model.slug}`}
                              className="btn btn-ghost !px-2.5 !py-1 text-xs"
                            >
                              Details →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line bg-slate-50/40 px-4 py-3 text-[11px] leading-relaxed text-muted">
              API rates are shown in USD. Public list prices are used where available; “est.” marks an indicative rate
              derived from plan pricing. Token models are priced per 1M tokens; image, video and voice models use their
              own units. Always confirm current rates with the provider before you build.
            </p>
            {models.length ? (
              <div className="border-t border-line bg-slate-50/50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Which model is best for what?
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {models.map((m) => (
                    <Link
                      key={m.model.id}
                      href={`/ai/${ai.slug}/${m.model.slug}`}
                      className="chip border border-line bg-white text-slate-600 transition hover:border-indigo-200 hover:text-brand"
                    >
                      <strong className="font-semibold">{m.model.bestFor || "General use"}</strong>
                      <span aria-hidden>→</span>
                      {m.model.name} · {m.score.toFixed(1)}★
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Subscription plans */}
          <section className="card p-5" id="plans">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="display text-lg text-ink">Subscription plans</h2>
                <p className="mt-1 text-xs text-muted">
                  Current plans for {ai.name}. Prices are updated from the admin panel.
                </p>
              </div>
              <span className="chip chip-brand">
                {ai.plans?.length ? `${ai.plans.length} plans` : "Not listed yet"}
              </span>
            </div>
            {ai.plans?.length ? (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {ai.plans.map((plan) => (
                  <div key={plan.id} className="border-l-2 border-line pl-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-ink">{plan.name}</p>
                      <p className="text-sm font-extrabold text-brand">
                        {formatPlanPrice(plan, settings.appearance)}
                      </p>
                    </div>
                    {plan.priceYearly !== null ? (
                      <p className="mt-0.5 text-[11px] text-muted">
                        ${plan.priceYearly.toFixed(plan.priceYearly % 1 === 0 ? 0 : 2)} / year
                      </p>
                    ) : null}
                    {plan.note ? <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">{plan.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Detailed plans have not been added from the admin panel yet. Starting price is{" "}
                {formatMoney(ai, settings.appearance)} — confirm the latest plans on the official website.
              </p>
            )}
            <PricingReport
              targetType="ai"
              targetId={ai.id}
              targetName={ai.name}
              back={`/ai/${ai.slug}`}
            />
          </section>

          {/* User contributions: private until an admin approves them */}
          <ContributePanel aiId={ai.id} aiSlug={ai.slug} aiName={ai.name} signedIn={Boolean(user)} />

          {user && myRequests.length ? (
            <section className="card p-5" id="my-requests">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="display text-lg text-ink">Your requests for {ai.name}</h2>
                <span className="chip bg-slate-100 text-slate-600">Only you can see these</span>
              </div>
              <div className="mt-2 divide-y divide-line">
                {myRequests.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                    <span
                      className={`chip ${
                        row.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : row.status === "rejected"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.status === "pending" ? "In review" : row.status}
                    </span>
                    <span className="font-semibold text-ink">
                      {CONTRIBUTION_LABEL[row.type]}: {row.title}
                    </span>
                    <span className="ml-auto text-muted">{timeAgo(row.createdAt)}</span>
                    {row.status === "rejected" && row.reviewNote ? (
                      <p className="w-full text-[11px] text-rose-600">Editor note: {row.reviewNote}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Price history & alerts */}
          <section className="card p-5" id="pricing">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="display text-lg text-ink">Price history</h2>
                <p className="mt-1 text-xs text-muted">
                  Starting-plan prices recorded whenever they change. Watch this tool to hear about the next one.
                </p>
              </div>
              {change ? (
                <span
                  className={`chip ${change.percent < 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}
                >
                  {change.percent < 0 ? "▼" : "▲"} {Math.abs(change.percent)}% {change.percent < 0 ? "cheaper" : "pricier"}
                </span>
              ) : (
                <span className="chip bg-slate-100 text-slate-600">Stable</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              {history.map((snapshot, index) => (
                <div key={snapshot.id} className="border-l-2 border-line pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {new Date(snapshot.at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                  </p>
                  <p className="text-sm font-extrabold text-ink">${snapshot.planPrice}</p>
                  {index === history.length - 1 ? (
                    <p className="text-[9.5px] font-semibold text-emerald-600">current</p>
                  ) : null}
                </div>
              ))}
              {history.length === 0 ? <p className="text-xs text-muted">No price recorded yet.</p> : null}
            </div>

            <form action={togglePriceAlertAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="aiId" value={ai.id} />
              <input type="hidden" name="back" value={`/ai/${ai.slug}#pricing`} />
              <button
                className={`btn !px-3 !py-1.5 text-xs ${
                  watching ? "bg-brand-soft text-brand border border-indigo-200" : "btn-ghost"
                }`}
              >
                {watching ? "🔔 Watching price" : "🔔 Alert me on price change"}
              </button>
              <span className="text-[11px] text-muted">
                {user
                  ? watching
                    ? "You will get an in-app notification and an email when delivery is on."
                    : `${db.priceAlerts?.filter((row) => row.aiId === ai.id).length ?? 0} people watch this price.`
                  : "Log in to watch this price."}
              </span>
            </form>
          </section>

          {/* About */}
          <section className="card p-5">
            <h2 className="display text-lg text-ink">About {ai.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{ai.description}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {ai.name} offers {models.length} models — {models.map((m) => m.model.name).join(", ")}. The most votes go to{" "}
              {models[0]?.model.name}, so it carries the most weight in the overall score. Start with the{" "}
              {ai.priceType === "paid" ? "paid plan" : "free plan"}, then share your own rating.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border-l-2 border-green-200 pl-3">
                <h3 className="text-sm font-bold text-green-700">Pros</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {ai.pros.map((p) => (
                    <li key={p} className="flex gap-1.5">
                      <span className="text-green-600">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-l-2 border-rose-200 pl-3">
                <h3 className="text-sm font-bold text-rose-600">Cons</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {ai.cons.map((c) => (
                    <li key={c} className="flex gap-1.5">
                      <span className="text-rose-400">✗</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Free alternative */}
          <section className="card p-5">
            <h2 className="display text-lg text-ink">Free alternative</h2>
            {freeAlternative ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                <AiLogo slug={freeAlternative.ai.slug} logo={freeAlternative.ai.logo} color={freeAlternative.ai.color} size={50} />
                <div className="min-w-0 flex-1">
                  <Link href={`/ai/${freeAlternative.ai.slug}`} className="font-semibold hover:text-brand">
                    {freeAlternative.ai.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Stars value={freeAlternative.score} size={15} />
                    <span className="text-xs font-semibold">{freeAlternative.score.toFixed(1)}</span>
                    <PriceBadge price={freeAlternative.ai.priceType} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{freeAlternative.ai.bestFor.join(" · ")}</p>
                </div>
                <a
                  href={freeAlternative.ai.website}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="btn btn-ghost !py-1.5 text-xs"
                >
                  Visit
                </a>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {ai.name} already has a free way to start — begin there. You only need a paid plan once your usage grows.
              </p>
            )}
          </section>

          {/* Prompt library */}
          <section className="card p-5" id="prompts">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="display text-lg text-ink">Prompt library</h2>
                <p className="text-xs text-muted">
                  Ready-made prompts for {ai.name} — free to copy, free to use.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-slate-100 text-slate-600">{prompts.length} prompts</span>
                <Link href={`/prompts?ai=${ai.slug}`} className="text-xs font-semibold text-brand">
                  All prompts →
                </Link>
              </div>
            </div>
            <div className="mt-3 divide-y divide-line">
              {prompts.map((p) => {
                const verifiedPrompt = isVerifiedPrompt(p);
                return (
                  <div key={p.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{p.title}</span>
                        {verifiedPrompt ? (
                          <span
                            className="chip bg-emerald-50 text-emerald-700"
                            title="Written or checked by the GigleNode team"
                          >
                            ✓ Verified
                          </span>
                        ) : null}
                      </h3>
                      <CopyButton text={p.promptText} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.promptText}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {verifiedPrompt && !p.submittedBy
                        ? "GigleNode team"
                        : `Community · ${p.submittedByName || "a member"}`}
                    </p>
                  </div>
                );
              })}
              {prompts.length === 0 ? (
                <p className="py-3 text-sm text-muted">No prompts here yet — be the first to add one.</p>
              ) : null}
            </div>

            {user ? (
              <PromptSubmitForm aiId={ai.id} aiName={ai.name} />
            ) : (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-xs text-slate-600">
                  Have a prompt that works well for {ai.name}? Add it to the library — log in first.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/ai/${ai.slug}#prompts`)}`}
                  className="btn btn-ghost mt-2 !py-1.5 text-xs"
                >
                  Log in to add a prompt
                </Link>
              </div>
            )}
          </section>

          {/* Reviews */}
          <section className="card p-5" id="reviews">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="display text-lg text-ink">User reviews</h2>
              {models[0] ? (
                <Link href={`/ai/${ai.slug}/${models[0].model.slug}`} className="text-sm font-semibold text-brand">
                  Rate a model →
                </Link>
              ) : null}
            </div>
            <div className="mt-3 divide-y divide-line">
              {reviews.map(({ rating, user: reviewer }) => {
                const model = db.models.find((m) => m.id === rating.modelId);
                return (
                  <div key={rating.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {reviewer?.avatar ?? "U"}
                      </span>
                      <span className="text-sm font-semibold">{reviewer?.name ?? "GigleNode user"}</span>
                      {reviewer?.verified ? (
                        <span className="chip bg-emerald-50 text-emerald-700">✓ verified</span>
                      ) : null}
                      <Stars value={rating.stars} size={15} />
                      <span className="ml-auto text-xs text-muted">{timeAgo(rating.updatedAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{rating.review}</p>
                    <p className="mt-1 text-xs text-muted">
                      {model ? `Rated on ${model.name}` : `Rated ${ai.name} overall`}
                    </p>
                    {rating.verified ? (
                      <p className="mt-1 text-[10.5px] font-semibold text-emerald-600">✓ Verified — opened from GigleNode</p>
                    ) : null}
                    {(replies.get(rating.id) ?? []).map((reply) => (
                      <div key={reply.id} className="mt-2 border-l-2 border-brand pl-3">
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand">
                          Reply from {reply.vendorName}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{reply.body}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{timeAgo(reply.createdAt)}</p>
                      </div>
                    ))}
                    {canReply ? <ReviewReplyForm ratingId={rating.id} /> : null}
                    <form action={reportRatingAction} className="mt-1.5">
                      <input type="hidden" name="id" value={rating.id} />
                      <input type="hidden" name="back" value={`/ai/${ai.slug}`} />
                      <button className="text-[11px] font-medium text-muted transition hover:text-rose-600">
                        ⚑ Report this review
                      </button>
                    </form>
                  </div>
                );
              })}
              {reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet. Be the first to write one.</p> : null}
            </div>
            {ai.claim ? (
              <p className="mt-3 border-l-2 border-line pl-3 text-[11px] leading-relaxed text-slate-600">
                ✓ Claimed listing — replies are published by <strong>{ai.claim.vendorName}</strong>.
              </p>
            ) : (
              <div className="mt-3">
                <ClaimListingForm aiId={ai.id} aiName={ai.name} />
              </div>
            )}
          </section>

          {/* Related posts */}
          {posts.length ? (
            <section>
              <SectionHead title="Related Posts" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-4">
          <div className="card p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted">Overall rating</p>
                <p className="text-3xl font-extrabold">{stat.score.toFixed(1)}</p>
              </div>
              <Stars value={stat.score} size={19} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {stat.votes.toLocaleString("en-IN")} votes · {stat.trend === "up" ? "trend up" : stat.trend === "down" ? "trend down" : "stable"}
            </p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Overall votes</span>
                <span className="font-semibold">{stat.aiVotes}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Model votes</span>
                <span className="font-semibold">{stat.modelVotes}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ratings in last 7 days</span>
                <span className="font-semibold">{stat.last7}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Weekly visits (est.)</span>
                <span className="font-semibold">{stat.weeklyVisits.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Starting plan</span>
                <span className="font-semibold">{formatMoney(ai, settings.appearance)}</span>
              </div>
            </div>
            <a
              href={`/go/${ai.slug}`}
              target="_blank"
              rel="nofollow noopener noreferrer sponsored"
              className="btn btn-primary mt-3 w-full"
            >
              Visit Official Site
            </a>
          </div>

          <Distribution dist={stat.dist} votes={stat.votes} />

          {trendPoints.length ? (
            <div className="card p-4">
              <RatingTrend points={trendPoints} />
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                Weekly average of every vote for this tool, including overall ratings.
              </p>
            </div>
          ) : null}

          <EmbedBadge slug={ai.slug} name={ai.name} />

          {settings.adsEnabled && settings.adsClientId && settings.adsSidebarSlot ? (
            <AdSlot clientId={settings.adsClientId} slotId={settings.adsSidebarSlot} variant="sidebar" />
          ) : null}

          {compareOpponent ? (
            <div className="card p-4">
              <h3 className="display text-base text-ink">Compare</h3>
              <p className="mt-1 text-xs text-muted">See how {ai.name} stacks up against another tool.</p>
              <Link
                href={`/compare/${ai.slug}-vs-${compareOpponent.slug}`}
                className="btn btn-ghost mt-2 w-full text-xs"
              >
                {ai.name} vs {compareOpponent.name}
              </Link>
            </div>
          ) : null}

          {models.length > 1 ? (
            <div className="card p-4">
              <h3 className="display text-base text-ink">Other models</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {models.slice(1).map((m) => (
                  <li key={m.model.id}>
                    <Link
                      href={`/ai/${ai.slug}/${m.model.slug}`}
                      className="flex items-center justify-between rounded-lg px-1 py-1 hover:bg-brand-soft hover:text-brand"
                    >
                      <span className="truncate">{m.model.name}</span>
                      <span className="text-xs text-muted">{m.score.toFixed(1)} ★</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Similar AI */}
      <section className="mt-10">
        <SectionHead eyebrow="Related tools" title={`More ${categoryName(ai.category)} AI`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...view.aiStats.values()]
            .filter((s) => !s.ai.hidden && s.ai.category === ai.category && s.ai.id !== ai.id)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((s) => (
              <AiCard
                key={s.ai.id}
                stat={s}
                saved={Boolean(user && db.bookmarks.some((b) => b.userId === user.id && b.aiId === s.ai.id))}
                back={`/ai/${ai.slug}`}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
