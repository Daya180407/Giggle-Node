import Link from "next/link";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import { getCurrentUser } from "@/lib/auth";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My List — Saved AI Tools" };

export default async function MyListPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-4xl">🔖</div>
        <h1 className="mt-3 text-xl font-extrabold">My List ke liye login kijiye</h1>
        <p className="mt-1 text-sm text-muted">
          Login karke kisi bhi AI ko save kijiye — sab yahan ek jagah milenge.
        </p>
        <Link href="/login?next=/my-list" className="btn btn-primary mt-4">
          Login
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">My List</h1>
          <p className="mt-1 text-sm text-muted">
            {user.name} ne {stats.length} AI save kiye hain · {followed.length} follow kar rahe hain.
          </p>
        </div>
        <Link href="/category/all" className="btn btn-ghost">
          Aur AI dhoondhiye →
        </Link>
      </div>

      {stats.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <AiCard key={s.ai.id} stat={s} saved back="/my-list" />
          ))}
        </div>
      ) : (
        <div className="card mt-5 p-10 text-center">
          <p className="text-sm text-muted">Abhi list khali hai. Kisi bhi AI card pe 🏷️ dabakar save kijiye.</p>
          <Link href="/category/all" className="btn btn-primary mt-3">
            Ranking dekhein
          </Link>
        </div>
      )}

      {followed.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Following</h2>
          <p className="mb-3 text-xs text-muted">
            In AI ke naye model ya price change par notification jayega (Resend email).
          </p>
          <div className="card divide-y divide-line">
            {followed.map((s) => (
              <Link
                key={s.ai.id}
                href={`/ai/${s.ai.slug}`}
                className="flex items-center gap-3 p-3 hover:bg-slate-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${s.ai.color}14` }}>
                  {s.ai.logo}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.ai.name}</p>
                  <p className="text-xs text-muted">
                    {s.models.length} models · {s.score.toFixed(1)} ★
                  </p>
                </div>
                <span className="text-xs text-brand">Dekhein →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
