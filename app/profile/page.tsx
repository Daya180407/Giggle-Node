import Link from "next/link";
import type { Metadata } from "next";
import { AiLogo, Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { buildView, contributorBoard, timeAgo } from "@/lib/rank";
import { resolveRoles, roleAreas, roleLabel } from "@/lib/roles";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile & Ratings",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 text-2xl ring-1 ring-indigo-100">
          👤
        </div>
        <h1 className="display mt-4 text-2xl text-ink">Log in to view your profile</h1>
        <p className="mt-2 text-sm text-muted">Track your ratings, reviews and saved tools in one place.</p>
        <Link href="/login?next=/profile" className="btn btn-primary mt-5">
          Log in
        </Link>
      </div>
    );
  }

  const view = buildView(db);
  const roles = resolveRoles(db.roles);
  const isStaff = roleAreas(user.role, roles).length > 0;
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="page-hero flex flex-wrap items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-2xl font-extrabold text-white shadow-lg shadow-indigo-500/25">
          {user.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-2xl text-ink">{user.name}</h1>
            {rankIndex >= 0 && rankIndex < 10 ? (
              <span className="chip bg-amber-100 text-amber-700">🏅 Top reviewer #{rankIndex + 1}</span>
            ) : null}
            {isStaff ? <span className="chip chip-brand">{roleLabel(user.role, roles)}</span> : null}
          </div>
          <p className="truncate text-sm text-slate-600" title={user.email}>
            {user.email}
          </p>
          <p className="text-xs text-muted">Member since {timeAgo(user.createdAt)}</p>
        </div>
        {isStaff ? (
          <Link href="/admin" className="btn btn-primary">
            Admin dashboard →
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ratings given", value: myRatings.length },
          { label: "Reviews written", value: reviews },
          { label: "Saved tools", value: bookmarks.length },
          { label: "Following", value: follows.length },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="display mt-0.5 text-2xl text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="display text-xl text-ink">My ratings</h2>
            <p className="mt-1 text-xs text-muted">
              You have given an average of {avgGiven ? avgGiven.toFixed(1) : "0"} ★. Edits are allowed once every 24
              hours.
            </p>
          </div>
          <Link href="/category/all" className="text-sm font-semibold text-brand transition hover:text-brand-dark">
            Rate another tool →
          </Link>
        </div>

        {myRatings.length ? (
          <div className="card mt-3 divide-y divide-line overflow-hidden">
            {myRatings.map((r) => {
              const model = db.models.find((m) => m.id === r.modelId);
              const ai = model ? db.ai.find((a) => a.id === model.aiId) : undefined;
              if (!model || !ai) return null;
              const stat = view.modelStats.get(model.id);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                  <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={40} rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/ai/${ai.slug}/${model.slug}`} className="text-sm font-semibold text-ink hover:text-brand">
                      {model.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {ai.name} · {timeAgo(r.updatedAt)} · model score {stat ? stat.score.toFixed(1) : "—"} ★
                    </p>
                    {r.review ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">“{r.review}”</p> : null}
                  </div>
                  <Stars value={r.stars} size={16} />
                  <Link href={`/ai/${ai.slug}/${model.slug}`} className="btn btn-ghost !px-2.5 !py-1 text-xs">
                    {r.lastEditedAt ? "Locked" : "Edit"}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-3 p-8 text-center text-sm text-muted">
            No ratings yet. Open any model page and leave a 1–5 star rating.
          </div>
        )}
      </section>
    </div>
  );
}
