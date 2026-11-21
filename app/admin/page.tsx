import Link from "next/link";
import { Stars } from "@/components/ui";
import { buildView, publishedPosts, rankedAis, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  const db = readDb();
  const view = buildView(db);
  const top = rankedAis(view).slice(0, 5);
  const recentRatings = [...db.ratings].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6);
  const last7 = db.ratings.filter((r) => Date.now() - +new Date(r.createdAt) < 7 * 86400000).length;
  const drafts = db.posts.filter((p) => p.status === "draft");

  const cards = [
    { label: "AI Tools", value: db.ai.length, href: "/admin/ai" },
    { label: "Models", value: db.models.length, href: "/admin/ai" },
    { label: "Total Ratings", value: db.ratings.length.toLocaleString("en-IN"), href: "/admin/ratings" },
    { label: "Ratings (7 din)", value: last7, href: "/admin/ratings" },
    { label: "Published Posts", value: publishedPosts(db).length, href: "/admin/posts" },
    { label: "Drafts", value: drafts.length, href: "/admin/posts" },
    { label: "Users", value: db.users.length.toLocaleString("en-IN"), href: "/admin/users" },
    { label: "Sponsored", value: db.ai.filter((a) => a.sponsored).length, href: "/admin/sponsors" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card card-hover p-4">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="text-2xl font-extrabold">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Top 5 Ranking (live)</h2>
            <Link href="/category/all" className="text-xs text-brand">
              Site pe dekhein →
            </Link>
          </div>
          <ol className="mt-2 divide-y divide-line">
            {top.map((s, i) => (
              <li key={s.ai.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-5 text-xs text-slate-400">{i + 1}</span>
                <span aria-hidden>{s.ai.logo}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{s.ai.name}</span>
                <Stars value={s.score} size={11} />
                <span className="text-xs font-semibold">{s.score.toFixed(2)}</span>
                <span className="text-xs text-muted">{s.votes}v</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Latest Ratings</h2>
            <Link href="/admin/ratings" className="text-xs text-brand">
              Moderate →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {recentRatings.map((r) => {
              const model = db.models.find((m) => m.id === r.modelId);
              const user = db.users.find((u) => u.id === r.userId);
              return (
                <div key={r.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="w-8 shrink-0 font-semibold">{r.stars}★</span>
                  <span className="min-w-0 flex-1 truncate">
                    {model?.name ?? "—"} <span className="text-muted">· {user?.name ?? "unknown"}</span>
                  </span>
                  <span className="shrink-0 text-muted">{timeAgo(r.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {drafts.length ? (
        <section className="card p-4">
          <h2 className="text-sm font-bold">Drafts</h2>
          <div className="mt-2 divide-y divide-line">
            {drafts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <Link href={`/admin/posts/${p.id}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card p-4">
        <h2 className="text-sm font-bold">Quick actions</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/admin/ai/new" className="btn btn-primary text-xs">
            + Naya AI
          </Link>
          <Link href="/admin/posts/new" className="btn btn-ghost text-xs">
            + Naya Post
          </Link>
          <Link href="/admin/sponsors" className="btn btn-ghost text-xs">
            Sponsors manage
          </Link>
          <Link href="/admin/ratings" className="btn btn-ghost text-xs">
            Fake rating report dekhein
          </Link>
        </div>
      </section>
    </div>
  );
}
