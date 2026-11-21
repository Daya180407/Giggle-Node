import Link from "next/link";
import { deleteRatingAction, updateRatingAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Stars } from "@/components/ui";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 60;

export default async function AdminRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stars?: string; page?: string }>;
}) {
  const { q = "", stars = "all", page = "1" } = await searchParams;
  const db = readDb();
  const query = q.trim().toLowerCase();

  const models = new Map(db.models.map((m) => [m.id, m]));
  const ais = new Map(db.ai.map((a) => [a.id, a]));
  const users = new Map(db.users.map((u) => [u.id, u]));

  const enriched = db.ratings.map((r) => {
    const model = models.get(r.modelId);
    const ai = model ? ais.get(model.aiId) : undefined;
    const user = users.get(r.userId);
    return { r, model, ai, user };
  });
  enriched.sort((a, b) => +new Date(b.r.updatedAt) - +new Date(a.r.updatedAt));

  const filtered = enriched.filter(({ r, model, ai, user }) => {
    if (stars !== "all" && r.stars !== Number(stars)) return false;
    if (!query) return true;
    return [model?.name, ai?.name, user?.name, user?.email, r.review]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const last7 = db.ratings.filter((r) => Date.now() - +new Date(r.createdAt) < 7 * 86400000).length;
  const params = (nextPage: number) =>
    `/admin/ratings?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(stars !== "all" ? { stars } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Community</p>
        <h2 className="display mt-1 text-2xl text-ink">Ratings moderation</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          Search, edit or remove any rating. Deleting a rating instantly recalculates the weighted ranking.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Total ratings", value: db.ratings.length.toLocaleString("en-IN") },
          { label: "With review", value: db.ratings.filter((r) => r.review?.trim()).length },
          { label: "Edited", value: db.ratings.filter((r) => r.lastEditedAt).length },
          { label: "Last 7 days", value: last7 },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/ratings">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search AI, model, user or review…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search ratings"
        />
        <select name="stars" defaultValue={stars} className="field !w-auto !py-2 text-xs" aria-label="Filter stars">
          <option value="all">All stars</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>
              {s} star
            </option>
          ))}
        </select>
        <button className="btn btn-primary !py-2 text-xs">Filter</button>
        {q || stars !== "all" ? (
          <Link href="/admin/ratings" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {rows.map(({ r, model, ai, user }) => (
          <div key={r.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={r.stars} size={12} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-semibold">{model?.name ?? "unknown model"}</span>{" "}
                  <span className="text-muted">· {ai?.name ?? "unknown AI"}</span>
                </p>
                <p className="truncate text-xs text-muted">
                  {user?.name ?? "unknown user"} · {user?.email ?? "no email"} · {timeAgo(r.updatedAt)}
                  {r.lastEditedAt ? " · user edited" : ""}
                </p>
              </div>
              <form action={deleteRatingAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="back" value="/admin/ratings" />
                <DeleteButton label="Delete" message="Ye rating delete karni hai? Ranking turant update ho jayegi." />
              </form>
            </div>

            {r.review ? <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">“{r.review}”</p> : null}

            <details className="mt-1.5">
              <summary className="cursor-pointer text-[11px] font-semibold text-brand">Admin edit</summary>
              <form action={updateRatingAction} className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <input type="hidden" name="id" value={r.id} />
                <select name="stars" defaultValue={r.stars} className="field !w-24 !py-1 text-xs" aria-label="Stars">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={s}>
                      {s} star
                    </option>
                  ))}
                </select>
                <input
                  name="review"
                  defaultValue={r.review ?? ""}
                  placeholder="Review text (optional)"
                  className="field min-w-[160px] flex-1 !py-1 text-xs"
                />
                <button className="btn btn-primary !px-2 !py-1 text-xs">Save</button>
              </form>
            </details>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No ratings match these filters.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Showing {filtered.length ? (pageNo - 1) * PER_PAGE + 1 : 0}–{Math.min(pageNo * PER_PAGE, filtered.length)} of{" "}
          {filtered.length}
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1.5">
            {pageNo > 1 ? (
              <Link href={params(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                ← Prev
              </Link>
            ) : null}
            <span className="px-1 text-xs text-muted">
              {pageNo} / {pages}
            </span>
            {pageNo < pages ? (
              <Link href={params(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
