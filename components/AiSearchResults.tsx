"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { reportAiSearchAction, toggleBookmarkAction } from "@/app/actions";
import { AiLogo, PriceBadge, Stars } from "@/components/ui";
import { formatVotes } from "@/lib/format";

type Card = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  color: string;
  category: string;
  categoryName: string;
  priceType: "free" | "freemium" | "paid";
  planPrice: number;
  planPriceInr: number;
  description: string;
  bestFor: string[];
  score: number;
  votes: number;
  sponsored: boolean;
  priceLabel?: string;
};

type Payload = {
  main_result: Card | null;
  other_results: Card[];
  free_alternative: Card | null;
  top_results: Card[];
  meta: {
    query?: string;
    categoryName?: string | null;
    budget?: string;
    useCase?: string;
    source?: string;
    cached?: boolean;
    limitReached?: boolean;
    error?: string | null;
  };
};

function ResultActions({ card, back }: { card: Card; back: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={`/go/${card.slug}`}
        target="_blank"
        rel="nofollow noopener noreferrer sponsored"
        className="btn btn-primary !px-3 !py-1.5 text-xs"
      >
        Visit
      </a>
      <Link href={`/ai/${card.slug}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">
        View details
      </Link>
      <form action={toggleBookmarkAction}>
        <input type="hidden" name="aiId" value={card.id} />
        <input type="hidden" name="back" value={back} />
        <button className="btn btn-ghost !px-3 !py-1.5 text-xs" title="Save to My List">
          🔖 Bookmark
        </button>
      </form>
    </div>
  );
}

export default function AiSearchResults({ query }: { query: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(query.trim().length >= 2);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as Payload;
      })
      .then((payload) => setData(payload))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  if (query.trim().length < 2) return null;

  if (loading) {
    return (
      <div className="card mt-5 overflow-hidden p-5" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <span className="live-dot" aria-hidden />
          Searching best AI for you…
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="card mt-5 border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-900">
        AI search is busy right now. Use the normal results below, or try again in a moment.
      </div>
    );
  }

  const { main_result: main, other_results: others, free_alternative: free, top_results: top, meta } = data;
  const back = `/search?q=${encodeURIComponent(query)}`;
  const compareHref = main && others[0] ? `/compare/${main.slug}-vs-${others[0].slug}` : "/compare";

  return (
    <section className="mt-5 space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="chip bg-brand-soft text-brand">AI search</span>
        {meta.categoryName ? <span className="chip bg-slate-100 text-slate-600">{meta.categoryName}</span> : null}
        {meta.budget && meta.budget !== "any" ? (
          <span className="chip bg-slate-100 text-slate-600">Budget: {meta.budget}</span>
        ) : null}
        {meta.cached ? (
          <span className="chip bg-emerald-50 text-emerald-700">Cached answer · no API cost</span>
        ) : meta.source === "llm" ? (
          <span className="chip bg-indigo-50 text-indigo-700">Fresh AI classification</span>
        ) : meta.source === "limit" ? (
          <span className="chip bg-amber-50 text-amber-700">Daily limit reached · catalogue pick</span>
        ) : (
          <span className="chip bg-slate-100 text-slate-600">Catalogue keyword match</span>
        )}
        <span className="ml-auto text-muted">AI names always come from our own database</span>
      </div>

      {main ? (
        <article className="card champ-first relative overflow-hidden p-4 sm:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <AiLogo slug={main.slug} logo={main.logo} color={main.color} size={64} rounded="rounded-2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Our no.1 pick</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Link href={`/ai/${main.slug}`} className="display text-xl text-ink hover:text-brand sm:text-2xl">
                  {main.name}
                </Link>
                <PriceBadge price={main.priceType} />
                {main.sponsored ? <span className="chip bg-slate-100 text-slate-500">Sponsored</span> : null}
              </div>
              <p className="text-xs text-muted">
                {main.categoryName} · {formatVotes(main.votes)} ratings
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Stars value={main.score} size={18} />
                <span className="text-sm font-bold">{main.score.toFixed(1)}</span>
                <span className="text-xs text-muted">weighted score</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-brand">{main.priceLabel ?? `$${main.planPrice}/mo`}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">starting plan</p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">{main.description}</p>

          {main.bestFor.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {main.bestFor.map((tag) => (
                <span key={tag} className="chip bg-slate-100 text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <ResultActions card={main} back={back} />
            <Link href={compareHref} className="btn btn-ghost !px-3 !py-1.5 text-xs">
              ⚖ Compare
            </Link>
          </div>

          <details className="mt-3 border-t border-line pt-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">
            Wrong answer? Report it to the team
            </summary>
            <form action={reportAiSearchAction} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="query" value={query} />
              <input type="hidden" name="aiId" value={main.id} />
              <input type="hidden" name="aiName" value={main.name} />
              <input
                name="reason"
                required
                minLength={3}
                maxLength={300}
                placeholder="Why is this not the right AI for the question?"
                className="field !py-2 text-xs"
              />
              <button className="btn btn-dark shrink-0 !py-2 text-xs">Send report</button>
            </form>
          </details>
        </article>
      ) : (
        <div className="card p-6 text-center">
          <p className="text-2xl" aria-hidden>
            🔍
          </p>
          <h3 className="display mt-1 text-lg text-ink">No AI found, try another keyword</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
            We only suggest tools that exist in the GiggleNode database, so nothing was invented. Try a category name,
            a task like “video” and “coding”, or request the tool you want.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/category/all" className="btn btn-primary text-xs">
              Browse all rankings
            </Link>
            <Link
              href={`/contact?type=feature&name=${encodeURIComponent(query)}`}
              className="btn btn-ghost text-xs"
            >
              Request this AI
            </Link>
          </div>
        </div>
      )}

      {others.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((card) => (
            <article key={card.id} className="card card-hover p-4">
              <div className="flex items-start gap-2.5">
                <AiLogo slug={card.slug} logo={card.logo} color={card.color} size={40} rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Link href={`/ai/${card.slug}`} className="truncate font-bold text-ink hover:text-brand">
                    {card.name}
                  </Link>
                  <p className="truncate text-[11px] text-muted">
                    {card.categoryName} · {card.priceLabel ?? `$${card.planPrice}/mo`}
                  </p>
                </div>
                <span className="text-sm font-bold">{card.score.toFixed(1)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{card.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted">{formatVotes(card.votes)} ratings</span>
                <ResultActions card={card} back={back} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {free ? (
        <article className="card border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <AiLogo slug={free.slug} logo={free.logo} color={free.color} size={44} rounded="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Free alternative</p>
              <Link href={`/ai/${free.slug}`} className="font-bold text-ink hover:text-emerald-700">
                {free.name}
              </Link>
              <p className="text-[11px] text-slate-600">
                {free.categoryName} · {free.score.toFixed(1)}★ · {free.priceLabel ?? "Free plan available"}
              </p>
            </div>
            <ResultActions card={free} back={back} />
          </div>
        </article>
      ) : null}

      {!main && top.length ? (
        <div>
          <h3 className="display text-base text-ink">Top 3 AI across all categories</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {top.map((card) => (
              <article key={card.id} className="card p-3">
                <div className="flex items-center gap-2">
                  <AiLogo slug={card.slug} logo={card.logo} color={card.color} size={32} rounded="rounded-lg" />
                  <Link href={`/ai/${card.slug}`} className="truncate text-sm font-semibold hover:text-brand">
                    {card.name}
                  </Link>
                  <span className="ml-auto text-xs font-bold">{card.score.toFixed(1)}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted">{card.categoryName}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
