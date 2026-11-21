import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { toggleBookmarkAction, toggleFollowAction } from "@/app/actions";
import AiCard from "@/components/AiCard";
import CopyButton from "@/components/CopyButton";
import Distribution from "@/components/Distribution";
import PostCard from "@/components/PostCard";
import ShareButton from "@/components/ShareButton";
import { AiLogo, PriceBadge, SectionHead, SponsoredTag, Stars, Trend } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { aiReviews, buildView, publishedPosts, promptsFor, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai) return { title: "AI not found" };
  const view = buildView(db);
  const stat = view.aiStats.get(ai.id)!;
  return {
    title: `${ai.name} Review, Rating & Models (2026)`,
    description: `${ai.name} — rated ${stat.score.toFixed(1)}/5 by ${stat.votes} users. Explore models, pricing, free alternatives, prompts and reviews.`,
    alternates: { canonical: `/ai/${ai.slug}` },
    openGraph: { title: `${ai.name} — GigleNode Rating`, description: ai.description.slice(0, 160) },
  };
}

export default async function AiDetailPage({ params }: Props) {
  const { slug } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai) notFound();

  const view = buildView(db);
  const stat = view.aiStats.get(ai.id)!;
  const models = [...stat.models].sort((a, b) => b.score - a.score || b.votes - a.votes);
  const prompts = promptsFor(db, ai.id);
  const reviews = aiReviews(db, ai.id, 8);
  const posts = publishedPosts(db).filter((p) => p.relatedAiIds.includes(ai.id)).slice(0, 3);
  const bookmarked = Boolean(user && db.bookmarks.some((b) => b.userId === user.id && b.aiId === ai.id));
  const followed = Boolean(user && db.follows.some((f) => f.userId === user.id && f.aiId === ai.id));
  const followers = db.follows.filter((f) => f.aiId === ai.id).length;

  const freeAltStat = ai.freeAlternativeId ? view.aiStats.get(ai.freeAlternativeId) : undefined;
  const fallbackFree = [...view.aiStats.values()]
    .filter((s) => s.ai.category === ai.category && s.ai.id !== ai.id && s.ai.priceType !== "paid")
    .sort((a, b) => b.score - a.score)[0];
  const freeAlternative = freeAltStat ?? (ai.priceType !== "free" ? fallbackFree : undefined);

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

      {/* Header */}
      <header className="page-hero mt-3">
        <div className="flex flex-wrap items-start gap-4">
          <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={78} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{ai.name}</h1>
              {ai.sponsored ? <SponsoredTag /> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Link href={`/category/${ai.category}`} className="chip bg-brand-soft text-brand">
                {categoryName(ai.category)}
              </Link>
              <PriceBadge price={ai.priceType} />
              <span>{models.length} models</span>
              <span>·</span>
              <span>{followers} followers</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Stars value={stat.score} size={18} />
              <span className="text-lg font-bold">{stat.score.toFixed(1)}</span>
              <span className="text-sm text-muted">({stat.votes.toLocaleString("en-IN")} ratings)</span>
              <Trend trend={stat.trend} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={ai.website}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="btn btn-primary"
          >
            Official Website ↗
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
          <ShareButton title={`${ai.name} — GigleNode rating`} />
        </div>

        {ai.sponsored ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Sponsored placement. This never changes the ranking formula
            {ai.boost > 0 ? ` (manual editor boost: +${ai.boost.toFixed(2)}).` : "."}
          </p>
        ) : null}
      </header>

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Models table */}
          <section className="card overflow-hidden" id="models">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
              <div>
                <h2 className="text-base font-bold">Models</h2>
                <p className="text-xs text-muted">Sorted by smart ranking — the strongest model comes first.</p>
              </div>
              <span className="chip chip-brand">Every model rated separately</span>
            </div>
            <div className="divide-y divide-line">
              {models.map((m) => (
                <div key={m.model.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/ai/${ai.slug}/${m.model.slug}`}
                      className="text-sm font-semibold hover:text-brand"
                    >
                      {m.model.name}
                    </Link>
                    <p className="truncate text-xs text-muted">Best for: {m.model.bestFor}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={m.score} size={12} />
                    <span className="text-sm font-semibold">{m.score.toFixed(1)}</span>
                    <span className="w-12 text-right text-xs text-muted">{m.votes}</span>
                  </div>
                  <PriceBadge price={m.model.priceType} />
                  <Link href={`/ai/${ai.slug}/${m.model.slug}`} className="btn btn-ghost !px-2.5 !py-1 text-xs">
                    Detail →
                  </Link>
                </div>
              ))}
            </div>
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
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-3">
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
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
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
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <AiLogo slug={freeAlternative.ai.slug} logo={freeAlternative.ai.logo} color={freeAlternative.ai.color} size={50} />
                <div className="min-w-0 flex-1">
                  <Link href={`/ai/${freeAlternative.ai.slug}`} className="font-semibold hover:text-brand">
                    {freeAlternative.ai.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Stars value={freeAlternative.score} size={12} />
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
                <p className="text-xs text-muted">Ready-made prompts for {ai.name} — copy and paste in seconds.</p>
              </div>
              <span className="chip bg-slate-100 text-slate-600">{prompts.length} prompts</span>
            </div>
            <div className="mt-3 space-y-2">
              {prompts.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    <CopyButton text={p.promptText} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.promptText}</p>
                </div>
              ))}
              {prompts.length === 0 ? (
                <p className="py-3 text-sm text-muted">Prompts for this tool are coming soon.</p>
              ) : null}
            </div>
          </section>

          {/* Reviews */}
          <section className="card p-5" id="reviews">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="display text-lg text-ink">User reviews</h2>
              <Link href={`/ai/${ai.slug}/${models[0]?.model.slug ?? ""}`} className="text-sm font-semibold text-brand">
                Rate a model →
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {reviews.map(({ rating, user: reviewer }) => {
                const model = db.models.find((m) => m.id === rating.modelId);
                return (
                  <div key={rating.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {reviewer?.avatar ?? "U"}
                      </span>
                      <span className="text-sm font-semibold">{reviewer?.name ?? "GigleNode user"}</span>
                      <Stars value={rating.stars} size={12} />
                      <span className="ml-auto text-xs text-muted">{timeAgo(rating.updatedAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{rating.review}</p>
                    {model ? <p className="mt-1 text-xs text-muted">Rated on {model.name}</p> : null}
                  </div>
                );
              })}
              {reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet. Be the first to write one.</p> : null}
            </div>
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
                <p className="text-xs text-muted">Weighted score</p>
                <p className="text-3xl font-extrabold">{stat.score.toFixed(1)}</p>
              </div>
              <Stars value={stat.score} size={16} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {stat.votes.toLocaleString("en-IN")} votes · {stat.trend === "up" ? "trend up" : stat.trend === "down" ? "trend down" : "stable"}
            </p>
            <div className="mt-3 space-y-1.5 text-xs">
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
                <span className="font-semibold">
                  {ai.priceType === "free" ? "Free" : `$${ai.planPrice}/mo`}
                </span>
              </div>
            </div>
            <a
              href={ai.website}
              target="_blank"
              rel="nofollow noopener noreferrer sponsored"
              className="btn btn-primary mt-3 w-full"
            >
              Visit Official Site
            </a>
          </div>

          <Distribution dist={stat.dist} votes={stat.votes} />

          <div className="card p-4">
            <h3 className="display text-base text-ink">Rate this tool</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Ratings are model-level. Pick a model and share how it worked for you.
            </p>
            {user ? (
              <div className="mt-2 space-y-1.5">
                {models.slice(0, 3).map((m) => (
                  <Link
                    key={m.model.id}
                    href={`/ai/${ai.slug}/${m.model.slug}`}
                    className="flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5 text-xs hover:border-indigo-200"
                  >
                    <span className="truncate">{m.model.name}</span>
                    <span className="font-semibold text-brand">Rate →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/ai/${ai.slug}`)}`} className="btn btn-primary mt-2 w-full text-xs">
                Log in to rate
              </Link>
            )}
          </div>

          <div className="card p-4">
            <h3 className="display text-base text-ink">Compare</h3>
            <p className="mt-1 text-xs text-muted">See how {ai.name} stacks up against another tool.</p>
            <Link href={`/compare/${ai.slug}-vs-${freeAlternative?.ai.slug ?? "chatgpt"}`} className="btn btn-ghost mt-2 w-full text-xs">
              {ai.slug === "chatgpt" ? "ChatGPT vs Gemini" : `${ai.name} vs ${freeAlternative?.ai.name ?? "ChatGPT"}`}
            </Link>
          </div>

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
            .filter((s) => s.ai.category === ai.category && s.ai.id !== ai.id)
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
