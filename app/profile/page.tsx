import Link from "next/link";
import type { Metadata } from "next";
import { Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { buildView, contributorBoard, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Meri Profile & Ratings" };

export default async function ProfilePage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-4xl">👤</div>
        <h1 className="mt-3 text-xl font-extrabold">Profile ke liye login kijiye</h1>
        <Link href="/login?next=/profile" className="btn btn-primary mt-4">
          Login
        </Link>
      </div>
    );
  }

  const view = buildView(db);
  const board = contributorBoard(db, 10);
  const rankIndex = board.findIndex((row) => row.user.id === user.id);
  const myRatings = db.ratings
    .filter((r) => r.userId === user.id)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const bookmarks = db.bookmarks.filter((b) => b.userId === user.id);
  const follows = db.follows.filter((f) => f.userId === user.id);
  const reviews = myRatings.filter((r) => r.review && r.review.trim().length > 0).length;
  const avgGiven = myRatings.length ? myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-2xl font-extrabold text-brand">
          {user.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold">{user.name}</h1>
            {rankIndex >= 0 && rankIndex < 10 ? (
              <span className="chip bg-amber-100 text-amber-700">🏅 Top Reviewer #{rankIndex + 1}</span>
            ) : null}
            {user.role === "admin" ? <span className="chip bg-brand-soft text-brand">Admin</span> : null}
          </div>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-xs text-muted">Member since {timeAgo(user.createdAt)}</p>
        </div>
        {user.role === "admin" ? (
          <Link href="/admin" className="btn btn-primary">
            Admin Dashboard →
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ratings di", value: myRatings.length },
          { label: "Reviews likhe", value: reviews },
          { label: "Bookmarks", value: bookmarks.length },
          { label: "Following", value: follows.length },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Meri Ratings</h2>
            <p className="text-xs text-muted">
              Aapne average {avgGiven ? avgGiven.toFixed(1) : "0"} ★ diya hai. Edit 24 ghante me ek baar allowed hai.
            </p>
          </div>
          <Link href="/category/all" className="text-sm font-semibold text-brand">
            Nayi rating dijiye →
          </Link>
        </div>

        {myRatings.length ? (
          <div className="card mt-3 divide-y divide-line">
            {myRatings.map((r) => {
              const model = db.models.find((m) => m.id === r.modelId);
              const ai = model ? db.ai.find((a) => a.id === model.aiId) : undefined;
              if (!model || !ai) return null;
              const stat = view.modelStats.get(model.id);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${ai.color}14` }}>
                    {ai.logo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/ai/${ai.slug}/${model.slug}`} className="text-sm font-semibold hover:text-brand">
                      {model.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {ai.name} · {timeAgo(r.updatedAt)} · model rating {stat ? stat.score.toFixed(1) : "—"} ★
                    </p>
                    {r.review ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">“{r.review}”</p> : null}
                  </div>
                  <Stars value={r.stars} size={13} />
                  <Link href={`/ai/${ai.slug}/${model.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                    {r.lastEditedAt ? "Locked" : "Edit"}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-3 p-8 text-center text-sm text-muted">
            Abhi koi rating nahi di. Kisi model page pe jaakar 1–5 star dijiye.
          </div>
        )}
      </section>
    </div>
  );
}
