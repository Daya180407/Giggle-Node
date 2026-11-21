import Link from "next/link";
import AiLogo from "@/components/AiLogo";
import { Stars } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import { buildView, publishedPosts, rankedAis, timeAgo } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { bootstrapDiagnostics, readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function dayStart(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export default function AdminOverviewPage() {
  const db = readDb();
  const settings = getSiteSettings(db);
  const adminLog = db.adminLog ?? [];
  const view = buildView(db);
  const top = rankedAis(view).slice(0, 5);
  const drafts = db.posts.filter((p) => p.status === "draft");
  const recentRatings = [...db.ratings]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 6);
  const recentUsers = [...db.users]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const diagnostics = bootstrapDiagnostics();

  const now = Date.now();
  const last7 = db.ratings.filter((r) => now - +new Date(r.createdAt) < 7 * 86400000).length;
  const prev7 = db.ratings.filter((r) => {
    const age = now - +new Date(r.createdAt);
    return age >= 7 * 86400000 && age < 14 * 86400000;
  }).length;
  const growth = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

  const daily = Array.from({ length: 7 }, (_, i) => {
    const start = dayStart(6 - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = db.ratings.filter((r) => {
      const at = +new Date(r.createdAt);
      return at >= +start && at < +end;
    }).length;
    return { label: start.toLocaleDateString("en-US", { weekday: "short" }), count };
  });
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  const categoryCounts = new Map<string, number>();
  for (const ai of db.ai) categoryCounts.set(ai.category, (categoryCounts.get(ai.category) ?? 0) + 1);
  const categoryRows = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slug, count]) => ({ slug, count }));
  const maxCategory = Math.max(1, ...categoryRows.map((c) => c.count));

  const cards = [
    { label: "AI tools", value: db.ai.length, hint: `${categoryCounts.size} categories`, href: "/admin/ai", icon: "🤖", tint: "#8b6cff" },
    { label: "Models", value: db.models.length, hint: "Rated separately", href: "/admin/ai", icon: "🧩", tint: "#3fd8e6" },
    {
      label: "Ratings",
      value: db.ratings.length,
      hint: `${last7} in last 7 days`,
      href: "/admin/ratings",
      icon: "★",
      tint: "#f4c95d",
    },
    { label: "Users", value: db.users.length, hint: `${db.users.filter((u) => u.banned).length} banned`, href: "/admin/users", icon: "👥", tint: "#4ade80" },
    {
      label: "Posts",
      value: db.posts.length,
      hint: `${drafts.length} drafts`,
      href: "/admin/posts",
      icon: "📝",
      tint: "#60a5fa",
    },
    {
      label: "Sponsors",
      value: db.ai.filter((a) => a.sponsored).length,
      hint: `${db.ai.filter((a) => a.boost > 0).length} with boost`,
      href: "/admin/sponsors",
      icon: "💼",
      tint: "#fb923c",
    },
    {
      label: "Bookmarks",
      value: db.bookmarks.length,
      hint: `${db.follows.length} follows`,
      href: "/admin/users",
      icon: "🔖",
      tint: "#f472b6",
    },
    {
      label: "Prompts",
      value: db.prompts.length,
      hint: "Prompt library",
      href: "/admin/ai",
      icon: "✨",
      tint: "#a78bfa",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Today</p>
          <h2 className="display mt-1 text-2xl text-ink sm:text-3xl">Everything at a glance</h2>
          <p className="mt-1 text-xs text-muted">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{" "}
            · changes go live immediately
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ai/new" className="btn btn-primary text-xs">
            + New AI
          </Link>
          <Link href="/admin/posts/new" className="btn btn-ghost text-xs">
            + New post
          </Link>
          <Link href="/admin/settings" className="btn btn-ghost text-xs">
            Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card card-hover group relative overflow-hidden p-3.5"
          >
            <span
              className="pointer-events-none absolute -right-5 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
              style={{ background: c.tint }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-1">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-sm"
                style={{ background: `${c.tint}18`, color: c.tint }}
                aria-hidden
              >
                {c.icon}
              </span>
              <span className="text-[10px] text-slate-300 transition group-hover:text-brand">↗</span>
            </div>
            <p className="relative mt-3 text-[24px] font-extrabold leading-none tracking-tight text-ink">
              {c.value.toLocaleString("en-IN")}
            </p>
            <p className="relative mt-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">{c.label}</p>
            <p className="relative mt-0.5 text-[10.5px] text-muted">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Ratings activity</h3>
              <p className="text-xs text-muted">New ratings per day, last 7 days</p>
            </div>
            <span
              className={`chip ${
                growth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
              }`}
            >
              {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs previous week
            </span>
          </div>

          <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
            {daily.map((d) => (
              <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-500">{d.count}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                  <span
                    className="block w-full rounded-lg bg-gradient-to-t from-indigo-600 via-violet-500 to-cyan-400 transition-all"
                    style={{ height: `${Math.max(6, (d.count / maxDaily) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <p className="text-lg font-extrabold">{last7}</p>
              <p className="text-[10px] text-muted">Last 7 days</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{db.ratings.filter((r) => r.review).length}</p>
              <p className="text-[10px] text-muted">With review</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{db.ratings.filter((r) => r.lastEditedAt).length}</p>
              <p className="text-[10px] text-muted">Edited</p>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Category mix</h3>
              <p className="text-xs text-muted">AI tools per category</p>
            </div>
            <Link href="/admin/ai" className="text-[11px] font-semibold text-brand">
              Manage →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {categoryRows.map((c) => (
              <div key={c.slug}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-slate-700">{categoryName(c.slug)}</span>
                  <span className="text-muted">{c.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${(c.count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Top 5 ranking</h3>
              <p className="text-xs text-muted">Live weighted score</p>
            </div>
            <Link href="/category/all" className="text-[11px] font-semibold text-brand">
              Public leaderboard →
            </Link>
          </div>
          <ol className="mt-2 divide-y divide-line">
            {top.map((s, i) => (
              <li key={s.ai.id} className="flex items-center gap-2 py-2.5">
                <span className="w-4 text-xs font-bold text-slate-400">{i + 1}</span>
                <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={32} rounded="rounded-lg" />
                <Link href={`/admin/ai/${s.ai.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand">
                  {s.ai.name}
                </Link>
                <Stars value={s.score} size={11} />
                <span className="text-xs font-semibold">{s.score.toFixed(1)}</span>
                <span className="hidden text-xs text-muted sm:inline">{s.votes}v</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">System health</h3>
              <p className="text-xs text-muted">Storage runtime and write queue</p>
            </div>
            <span
              className={`chip ${
                diagnostics.bootError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {diagnostics.bootError ? "Attention" : "Healthy"}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-line bg-slate-50/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted">Runtime</dt>
              <dd className="mt-0.5 font-bold">{diagnostics.runtime.toUpperCase()}</dd>
            </div>
            <div className="rounded-xl border border-line bg-slate-50/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted">Pending writes</dt>
              <dd className="mt-0.5 font-bold">{diagnostics.pendingWrites}</dd>
            </div>
            <div className="rounded-xl border border-line bg-slate-50/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted">Signups</dt>
              <dd className={`mt-0.5 font-bold ${settings.allowSignups ? "text-emerald-600" : "text-rose-600"}`}>
                {settings.allowSignups ? "Open" : "Paused"}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-slate-50/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted">Promotions</dt>
              <dd className={`mt-0.5 font-bold ${settings.showPromotions ? "text-emerald-600" : "text-rose-600"}`}>
                {settings.showPromotions ? "Visible" : "Hidden"}
              </dd>
            </div>
          </dl>
          {diagnostics.bootError ? (
            <p className="mt-3 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{diagnostics.bootError}</p>
          ) : (
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Data document is being persisted to {diagnostics.runtime === "r2" ? "Cloudflare R2" : "the local store"}. Use{" "}
              <Link href="/admin/export" className="font-semibold text-brand">
                Export data
              </Link>{" "}
              before large changes.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Latest ratings</h3>
            <Link href="/admin/ratings" className="text-[11px] font-semibold text-brand">
              Moderate →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {recentRatings.map((r) => {
              const model = db.models.find((m) => m.id === r.modelId);
              const user = db.users.find((u) => u.id === r.userId);
              return (
                <div key={r.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="w-7 shrink-0 font-semibold">{r.stars}★</span>
                  <span className="min-w-0 flex-1 truncate">
                    {model?.name ?? "—"} <span className="text-muted">· {user?.name ?? "unknown"}</span>
                  </span>
                  <span className="shrink-0 text-muted">{timeAgo(r.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">New users</h3>
            <Link href="/admin/users" className="text-[11px] font-semibold text-brand">
              Manage →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 py-2 text-xs">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                  {u.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-ink">{u.name}</span>
                  <span className="block truncate text-[10.5px] text-muted">{u.email}</span>
                </span>
                {u.banned ? <span className="chip bg-rose-50 text-rose-600">banned</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Admin activity</h3>
            <Link href="/admin/activity" className="text-[11px] font-semibold text-brand">
              Full log →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {adminLog.slice(0, 5).map((entry) => (
              <div key={entry.id} className="py-2 text-xs">
                <p className="truncate">
                  <span className="font-semibold">{entry.userName}</span>{" "}
                  <span className="text-muted">{entry.action}</span>{" "}
                  <span className="font-medium">{entry.target}</span>
                </p>
                <p className="text-[10px] text-muted">{timeAgo(entry.at)}</p>
              </div>
            ))}
            {adminLog.length === 0 ? (
              <p className="py-4 text-xs text-muted">No admin actions logged yet. Changes will appear here.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Quick actions</h3>
            <p className="text-xs text-muted">Jump straight into the most common jobs</p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">{publishedPosts(db).length} published posts</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/ai/new" className="btn btn-primary text-xs">
            + Add AI tool
          </Link>
          <Link href="/admin/posts/new" className="btn btn-ghost text-xs">
            + Write post
          </Link>
          <Link href="/admin/ratings" className="btn btn-ghost text-xs">
            Moderate ratings
          </Link>
          <Link href="/admin/users" className="btn btn-ghost text-xs">
            Manage users
          </Link>
          <Link href="/admin/sponsors" className="btn btn-ghost text-xs">
            Sponsorships
          </Link>
          <Link href="/admin/settings" className="btn btn-ghost text-xs">
            Site settings
          </Link>
        </div>
      </section>
    </div>
  );
}
