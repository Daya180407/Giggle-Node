import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ApiPricing from "@/components/ApiPricing";
import Distribution from "@/components/Distribution";
import PricingReport from "@/components/PricingReport";
import RatingWidget from "@/components/RatingWidget";
import { AiLogo, PriceBadge, Stars, Trend } from "@/components/ui";
import { getApiPricing } from "@/lib/api-pricing";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { canAccess, resolveRoles } from "@/lib/roles";
import { formatPlanPrice } from "@/lib/plans";
import { reportRatingAction } from "@/app/actions";
import { buildView, formatDate, modelReviews, timeAgo } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; model: string }>;
  searchParams: Promise<{ pricingReport?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, model: modelSlug } = await params;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  const model = db.models.find((m) => m.aiId === ai?.id && m.slug === modelSlug);
  if (!ai || !model) return { title: "Model not found" };
  const view = buildView(db);
  const stat = view.modelStats.get(model.id);
  return {
    title: `${model.name} Rating & Review — ${ai.name}`,
    description: `${model.name} (${ai.name}) — ${stat?.score.toFixed(1)}/5 rating, ${stat?.votes} user votes. Best for ${model.bestFor}.`,
    alternates: { canonical: `/ai/${ai.slug}/${model.slug}` },
  };
}

export default async function ModelPage({ params, searchParams }: Props) {
  const { slug, model: modelSlug } = await params;
  const { pricingReport } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const ai = db.ai.find((a) => a.slug === slug);
  const model = db.models.find((m) => m.aiId === ai?.id && m.slug === modelSlug);
  if (!ai || !model) notFound();

  const view = buildView(db);
  const settings = getSiteSettings(db);
  const stat = view.modelStats.get(model.id)!;
  const apiPricing = getApiPricing(ai, model);
  const existing = user ? db.ratings.find((r) => r.userId === user.id && r.modelId === model.id) ?? null : null;
  const reviews = modelReviews(db, model.id, 8);
  const siblings = (view.modelsByAi.get(ai.id) ?? [])
    .filter((m) => m.id !== model.id)
    .map((m) => view.modelStats.get(m.id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${model.name} (${ai.name})`,
    description: model.description,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(stat.score.toFixed(1)),
      ratingCount: stat.votes,
      bestRating: 5,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/category/${ai.category}`} className="hover:text-brand">
          {categoryName(ai.category)}
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/ai/${ai.slug}`} className="hover:text-brand">
          {ai.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{model.name}</span>
      </nav>

      {pricingReport === "sent" ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Report sent. An admin will check the price and update it.
        </div>
      ) : null}
      {pricingReport === "short" ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          Please enter at least 5 characters for the report.
        </div>
      ) : null}

      <header className="card mt-3 p-5">
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft/70 p-3">
          <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={38} rounded="rounded-lg" />
          <p className="text-sm text-slate-700">
            This model is part of <strong>{ai.name}</strong>.
          </p>
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost ml-auto !py-1.5 text-xs">
            ← Back to {ai.name}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{model.name}</h1>
            <p className="mt-1 text-sm text-muted">Best for: {model.bestFor}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Stars value={stat.score} size={18} />
              <span className="text-lg font-bold">{stat.score.toFixed(1)}</span>
              <span className="text-sm text-muted">({stat.votes} votes)</span>
              <Trend trend={stat.trend} />
              <PriceBadge price={model.priceType} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/go/${ai.slug}`}
              target="_blank"
              rel="nofollow noopener noreferrer sponsored"
              className="btn btn-primary"
            >
              Try {model.name} ↗
            </a>
            <a href="#rate" className="btn btn-ghost">
              ★ Rate this model
            </a>
            <Link href={`/compare/${ai.slug}`} className="btn btn-ghost">
              Compare With Other AI
            </Link>
            {user && canAccess(user.role, "catalogue", resolveRoles(db.roles)) ? (
              <Link href={`/admin/ai/${ai.slug}`} className="btn btn-ghost">
                ✎ Admin edit
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted">Launch date</dt>
            <dd className="font-semibold">{formatDate(model.launchDate)}</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="font-semibold capitalize">{model.priceType}</dd>
          </div>
          <div>
            <dt className="text-muted">Parent AI</dt>
            <dd className="font-semibold">{ai.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Total votes</dt>
            <dd className="font-semibold">{stat.votes}</dd>
          </div>
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{model.description}</p>
      </header>

      <section className="card mt-4 p-5" id="api-pricing">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="eyebrow">Build with {model.name}</p>
            <h2 className="display mt-1 text-lg text-ink">API pricing</h2>
            <p className="mt-1 text-xs text-muted">
              Model-level rates for developers. {apiPricing.unit === "1M tokens" ? "Token pricing is per 1M tokens." : `Priced per ${apiPricing.unit}.`}
            </p>
          </div>
          <span className={`chip ${apiPricing.available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {apiPricing.available ? (apiPricing.estimated ? "Indicative API rate" : "Public API list price") : "No public API"}
          </span>
        </div>
        <div className="mt-4">
          <ApiPricing pricing={apiPricing} detail />
        </div>
        <PricingReport
          targetType="model"
          targetId={model.id}
          targetName={`${ai.name} · ${model.name}`}
          back={`/ai/${ai.slug}/${model.slug}`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div id="rate" className="scroll-mt-24">
            {settings.allowRatings ? (
              <RatingWidget
                modelId={model.id}
                existing={existing}
                isLoggedIn={Boolean(user)}
                loginNext={`/ai/${ai.slug}/${model.slug}`}
              />
            ) : (
              <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Ratings are paused</p>
                <p className="mt-1 text-xs">The administrator has temporarily disabled new ratings and reviews.</p>
              </div>
            )}
          </div>

          <section className="card p-5">
            <h2 className="display text-lg text-ink">Reviews for this model</h2>
            <div className="mt-3 space-y-3">
              {reviews.map(({ rating, user: reviewer }) => (
                <div key={rating.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      {reviewer?.avatar ?? "U"}
                    </span>
                    <span className="text-sm font-semibold">{reviewer?.name ?? "User"}</span>
                    {reviewer?.verified ? (
                      <span className="chip bg-emerald-50 text-emerald-700">✓ verified</span>
                    ) : null}
                    <Stars value={rating.stars} size={12} />
                    {rating.lastEditedAt ? (
                      <span className="chip bg-slate-100 text-slate-500">edited</span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted">{timeAgo(rating.updatedAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{rating.review}</p>
                  <form action={reportRatingAction} className="mt-1.5">
                    <input type="hidden" name="id" value={rating.id} />
                    <input type="hidden" name="back" value={`/ai/${ai.slug}/${model.slug}`} />
                    <button className="text-[11px] font-medium text-muted transition hover:text-rose-600">
                      ⚑ Report this review
                    </button>
                  </form>
                </div>
              ))}
              {reviews.length === 0 ? (
                <p className="text-sm text-muted">No reviews yet. You can write the first one.</p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <Distribution dist={stat.dist} votes={stat.votes} />

          {ai.plans?.length ? (
            <div className="card p-4">
              <h3 className="display text-base text-ink">Plans from {ai.name}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {ai.plans.map((plan) => (
                  <li key={plan.id} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{plan.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-brand">
                      {formatPlanPrice(plan, settings.appearance)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/ai/${ai.slug}#plans`} className="btn btn-ghost mt-2 w-full text-xs">
                Plan details
              </Link>
            </div>
          ) : null}

          <div className="card p-4">
            <h3 className="display text-base text-ink">Other models from {ai.name}</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {siblings.map((s) => (
                <li key={s.model.id}>
                  <Link
                    href={`/ai/${ai.slug}/${s.model.slug}`}
                    className="block rounded-lg px-1.5 py-1.5 hover:bg-brand-soft hover:text-brand"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.model.name}</span>
                      <span className="shrink-0 text-xs text-muted">{s.score.toFixed(1)} ★</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                      Best for: {s.model.bestFor || "general use"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/ai/${ai.slug}`} className="btn btn-ghost mt-2 w-full text-xs">
              View all models
            </Link>
          </div>

          <div className="card p-4">
            <h3 className="display text-base text-ink">How ratings work</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Rate 1–5 stars — one rating per user. Editing updates your existing rating and starts a 24-hour lock.
              Models with fewer votes are weighted down so small samples cannot game the ranking.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
