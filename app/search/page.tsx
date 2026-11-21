import Link from "next/link";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import PostCard from "@/components/PostCard";
import { PriceBadge, Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { buildView, searchAll, trendingAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search AI, Models & Posts",
  description: "AI ka naam, category ya kaam likhiye — GigleNode seedha sahi tool tak le jata hai.",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const results = searchAll(view, q);
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);
  const suggestions = ["chatgpt", "video", "coding", "free", "youtube", "hindi", "thumbnail", "music"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">
        {q ? `“${q}” ke results` : "Search"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        AI name, model name, category aur kaam — teeno search hote hain. Jaise “YouTube ke liye” ya “free coding”.
      </p>

      <form action="/search" className="mt-4 flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="AI, model ya kaam likhiye…"
          className="field !py-2.5"
          aria-label="Search"
        />
        <button className="btn btn-primary">Search</button>
      </form>

      {!q ? (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-500">Popular searches</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip border border-line bg-white text-slate-600">
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">Trending AI</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trendingAis(view, 4).map((s) => (
                <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back="/search" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold">AI Tools ({results.ais.length})</h2>
            {results.ais.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.ais.slice(0, 8).map((s) => (
                  <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back={`/search?q=${encodeURIComponent(q)}`} />
                ))}
              </div>
            ) : (
              <p className="card p-6 text-sm text-muted">Koi AI match nahi hua. Category page try kijiye.</p>
            )}
          </section>

          {results.models.length ? (
            <section>
              <h2 className="mb-3 text-lg font-bold">Models ({results.models.length})</h2>
              <div className="card divide-y divide-line">
                {results.models.slice(0, 10).map((m) => (
                  <Link
                    key={m.model.id}
                    href={`/ai/${m.ai.slug}/${m.model.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.model.name}</p>
                      <p className="truncate text-xs text-muted">
                        {m.ai.name} · {categoryName(m.ai.category)} · {m.model.bestFor}
                      </p>
                    </div>
                    <Stars value={m.score} size={12} />
                    <span className="text-xs font-semibold">{m.score.toFixed(1)}</span>
                    <PriceBadge price={m.model.priceType} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.posts.length ? (
            <section>
              <h2 className="mb-3 text-lg font-bold">Posts ({results.posts.length})</h2>
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
