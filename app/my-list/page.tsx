import Link from "next/link";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import { getCurrentUser } from "@/lib/auth";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My List — Saved AI Tools",
  robots: { index: false, follow: false },
};

export default async function MyListPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 text-2xl ring-1 ring-indigo-100">
          🔖
        </div>
        <h1 className="display mt-4 text-2xl text-ink">Your list is waiting</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Log in and save any AI tool — your shortlist stays here, across every device.
        </p>
        <Link href="/login?next=/my-list" className="btn btn-primary mt-5">
          Log in to continue
        </Link>
      </div>
    );
  }

  const view = buildView(db);
  const savedIds = db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId);
  const stats = savedIds
    .map((id) => view.aiStats.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const followed = db.follows
    .filter((f) => f.userId === user.id)
    .map((f) => view.aiStats.get(f.aiId))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Your shortlist</span>
          <h1 className="display mt-1.5 text-3xl text-ink sm:text-4xl">My List</h1>
          <p className="mt-1.5 text-sm text-muted">
            {stats.length} saved {stats.length === 1 ? "tool" : "tools"} · following {followed.length}
          </p>
        </div>
        <Link href="/category/all" className="btn btn-ghost">
          Find more AI →
        </Link>
      </div>

      {stats.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <AiCard key={s.ai.id} stat={s} saved back="/my-list" />
          ))}
        </div>
      ) : (
        <div className="card mt-6 p-10 text-center">
          <p className="text-sm text-muted">Nothing saved yet. Tap the bookmark icon on any AI card to add it here.</p>
          <Link href="/category/all" className="btn btn-primary mt-4">
            Browse the leaderboard
          </Link>
        </div>
      )}

      {followed.length ? (
        <section className="mt-12">
          <h2 className="display text-xl text-ink">Following</h2>
          <p className="mb-3 mt-1 text-xs text-muted">You will be notified about new models and price changes.</p>
          <div className="card divide-y divide-line overflow-hidden">
            {followed.map((s) => (
              <Link
                key={s.ai.id}
                href={`/ai/${s.ai.slug}`}
                className="flex items-center gap-3 p-3 transition hover:bg-slate-50/80 sm:p-4"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-line"
                  style={{ background: `${s.ai.color}14` }}
                >
                  {s.ai.logo}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{s.ai.name}</p>
                  <p className="text-xs text-muted">
                    {s.models.length} models · {s.score.toFixed(1)} ★
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand">View →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
