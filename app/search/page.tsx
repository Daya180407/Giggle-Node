import Link from "next/link";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import AiSearchResults from "@/components/AiSearchResults";
import PostCard from "@/components/PostCard";
import { PriceBadge, Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { buildView, searchAll, trendingAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search AI Tools, Models & Guides",
  description: "Search by tool name, category or task — GigleNode takes you straight to the right AI.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

const SUGGESTIONS = ["chatgpt", "video", "coding", "free", "youtube", "thumbnail", "music", "writing"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reported?: string; sent?: string }>;
}) {
  const { q = "", reported } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const results = searchAll(view, q);
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <span className="eyebrow">Search</span>
      <h1 className="display mt-1.5 text-3xl text-ink sm:text-4xl">
        {q ? `Results for “${q}”` : "Find your next AI tool"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Search by tool, model, category or task — for example “free coding” or “AI for YouTube thumbnails”.
      </p>

      {reported ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {reported === "empty"
            ? "Add a short reason so the team can review the answer."
            : "Thanks — the team will review this AI search answer."}
        </div>
      ) : null}

      <form action="/search" className="search-shell mt-5 max-w-2xl" role="search">
        <div className="search-inner">
          <span className="hidden text-slate-400 sm:block" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Search AI tools, models or tasks…"
            className="search-input"
            aria-label="Search"
          />
          <button className="btn btn-primary shrink-0 !rounded-full !px-4">Search</button>
        </div>
      </form>

      {q ? <AiSearchResults query={q} /> : null}

      {!q ? (
        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-sm font-bold text-slate-500">Popular searches</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="chip border border-line bg-white text-slate-600 transition hover:border-indigo-200 hover:text-brand"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="display mb-3 text-xl text-ink">Trending AI</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trendingAis(view, 4).map((s) => (
                <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back="/search" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {results.ais.length ? (
            <section>
              <h2 className="display mb-3 text-xl text-ink">
                AI tools <span className="text-slate-400">({results.ais.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.ais.slice(0, 8).map((s) => (
                  <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back={`/search?q=${encodeURIComponent(q)}`} />
                ))}
              </div>
            </section>
          ) : null}

          {results.models.length ? (
            <section>
              <h2 className="display mb-3 text-xl text-ink">
                Models <span className="text-slate-400">({results.models.length})</span>
              </h2>
              <div className="card divide-y divide-line overflow-hidden">
                {results.models.slice(0, 10).map((m) => (
                  <Link
                    key={m.model.id}
                    href={`/ai/${m.ai.slug}/${m.model.slug}`}
                    className="flex items-center gap-3 p-3 transition hover:bg-slate-50/80 sm:p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{m.model.name}</p>
                      <p className="truncate text-xs text-muted">
                        {m.ai.name} · {categoryName(m.ai.category)} · {m.model.bestFor}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Stars value={m.score} size={15} />
                      <span className="text-xs font-semibold">{m.score.toFixed(1)}</span>
                    </div>
                    <span className="hidden sm:block">
                      <PriceBadge price={m.model.priceType} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.posts.length ? (
            <section>
              <h2 className="display mb-3 text-xl text-ink">
                Guides <span className="text-slate-400">({results.posts.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.posts.slice(0, 6).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
