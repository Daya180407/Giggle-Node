import Link from "next/link";
import { searchUsageToday } from "@/lib/ai-search";
import { requireAreaPage } from "@/lib/permissions";
import { publishedPosts } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function Bars({ rows, empty }: { rows: { label: string; value: number; hint?: string }[]; empty: string }) {
  const max = rows.reduce((peak, row) => Math.max(peak, row.value), 0);
  if (rows.length === 0) return <p className="py-4 text-xs text-muted">{empty}</p>;
  return (
    <div className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-medium text-slate-700">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{row.value.toLocaleString("en-IN")}</span>
          </div>
          <div className="score-bar mt-1">
            <span style={{ width: `${max ? Math.max(2, Math.round((row.value / max) * 100)) : 0}%` }} />
          </div>
          {row.hint ? <p className="mt-0.5 text-[10px] text-muted">{row.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAreaPage("analytics");
  const db = readDb();
  const usage = searchUsageToday(db);
  const traffic = [...(db.traffic ?? [])].sort((a, b) => b.count - a.count);
  const trafficTotal = traffic.reduce((sum, row) => sum + row.count, 0);
  const topAi = [...db.ai]
    .filter((ai) => !ai.hidden)
    .sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0))
    .slice(0, 8);
  const posts = [...publishedPosts(db)]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 8);
  const searchTerms = [...(db.searchLogs ?? [])].sort((a, b) => b.count - a.count).slice(0, 10);
  const cached = [...(db.searchCache ?? [])].sort((a, b) => b.hits - a.hits).slice(0, 8);
  const totalVisits = db.ai.reduce((sum, ai) => sum + (ai.visits ?? 0), 0);
  const totalPostViews = db.posts.reduce((sum, post) => sum + (post.views ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Analytics & reports</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Visit clicks, post reads, referrer channels, search demand and AI-search usage. Tracking starts when the
            page beacon or a Visit button is used.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{totalVisits.toLocaleString("en-IN")} AI visits</span>
          <span className="chip bg-slate-100 text-slate-600">{totalPostViews.toLocaleString("en-IN")} post reads</span>
          <span className="chip bg-slate-100 text-slate-600">{trafficTotal.toLocaleString("en-IN")} sessions tracked</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Most viewed AI</h3>
              <p className="text-xs text-muted">Clicks on the public Visit button.</p>
            </div>
            <Link href="/admin/ai" className="text-[11px] font-semibold text-brand">
              Catalogue →
            </Link>
          </div>
          <Bars
            rows={topAi.map((ai) => ({
              label: ai.name,
              value: ai.visits ?? 0,
              hint: `${ai.category} · ${ai.priceType}${ai.sponsored ? " · sponsored" : ""}`,
            }))}
            empty="No Visit clicks recorded yet."
          />
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Most read posts</h3>
              <p className="text-xs text-muted">Blog page opens, one per browser session.</p>
            </div>
            <Link href="/admin/posts" className="text-[11px] font-semibold text-brand">
              Posts →
            </Link>
          </div>
          <Bars
            rows={posts.map((post) => ({
              label: post.title,
              value: post.views ?? 0,
              hint: `${post.type} · ${new Date(post.createdAt).toLocaleDateString("en-IN")}`,
            }))}
            empty="No published posts yet."
          />
        </section>

        <section className="card p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-bold">Where visitors come from</h3>
            <p className="text-xs text-muted">Referrer channel for tracked public page opens.</p>
          </div>
          <Bars
            rows={traffic.slice(0, 10).map((row) => ({
              label: row.source,
              value: row.count,
              hint: `Last seen ${new Date(row.lastAt).toLocaleDateString("en-IN")}`,
            }))}
            empty="No traffic recorded yet."
          />
          {trafficTotal > 0 ? (
            <p className="mt-3 text-[11px] text-muted">
              Internal clicks are tracked separately from external channels. Direct means no referrer was sent.
            </p>
          ) : null}
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">What people search for</h3>
              <p className="text-xs text-muted">Top public search terms — good post ideas.</p>
            </div>
            <Link href="/admin/posts/new" className="text-[11px] font-semibold text-brand">
              Write a post →
            </Link>
          </div>
          {searchTerms.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {searchTerms.map((term) => (
                <span key={term.q} className="chip bg-slate-100 text-slate-600">
                  {term.q} · {term.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="py-4 text-xs text-muted">No searches recorded yet.</p>
          )}
          <div className="mt-4 rounded-xl border border-line bg-slate-50/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">AI search usage (24h)</p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-700">
              <span>
                <strong>{usage.requests}</strong> searches
              </span>
              <span>
                <strong>{usage.cached}</strong> cache hits
              </span>
              <span>
                <strong>{usage.llm}</strong> model calls
              </span>
              <span>
                <strong>{db.searchCache?.length ?? 0}</strong> cached answers
              </span>
            </div>
          </div>
          {cached.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Most reused answers</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {cached.map((row) => (
                  <li key={row.normalized} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">“{row.query}”</span>
                    <span className="text-muted">{row.hits} hits</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        These are first-party counts stored with the site data. For deeper reporting (devices, geography, funnels),
        connect an analytics provider — the beacon can send the same events to it later.
      </p>
    </div>
  );
}
