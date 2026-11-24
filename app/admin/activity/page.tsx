import Link from "next/link";
import { timeAgo } from "@/lib/rank";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  updated: "bg-indigo-50 text-indigo-700",
  deleted: "bg-rose-50 text-rose-600",
  published: "bg-cyan-50 text-cyan-700",
  unpublished: "bg-amber-50 text-amber-700",
  banned: "bg-rose-50 text-rose-600",
  unbanned: "bg-emerald-50 text-emerald-700",
  "hid app": "bg-rose-50 text-rose-600",
  "showed app": "bg-emerald-50 text-emerald-700",
  "boost set": "bg-amber-50 text-amber-700",
  "role changed": "bg-violet-50 text-violet-700",
  duplicated: "bg-cyan-50 text-cyan-700",
  "edited rating": "bg-indigo-50 text-indigo-700",
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAreaPage("settings");
  const { q = "", page = "1" } = await searchParams;
  const db = readDb();
  const adminLog = db.adminLog ?? [];
  const query = q.trim().toLowerCase();
  const filtered = adminLog.filter((entry) => {
    if (!query) return true;
    return [entry.userName, entry.action, entry.target, entry.detail].join(" ").toLowerCase().includes(query);
  });
  const perPage = 100;
  const current = Math.max(1, Number(page) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageNo = Math.min(current, pages);
  const rows = filtered.slice((pageNo - 1) * perPage, pageNo * perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System</p>
          <h2 className="display mt-1 text-2xl text-ink">Audit log</h2>
          <p className="mt-1 text-xs text-muted">
            {adminLog.length.toLocaleString("en-IN")} admin actions recorded · newest first · max 500 retained
          </p>
        </div>
        <Link href="/admin/settings" className="btn btn-ghost text-xs">
          Site settings
        </Link>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/activity">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search admin, action, target…"
          className="field max-w-sm flex-1 !py-2 text-xs"
          aria-label="Search audit log"
        />
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q ? (
          <Link href="/admin/activity" className="btn btn-ghost !py-2 text-xs">
            Clear
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {rows.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className={`chip ${ACTION_TONE[entry.action] ?? "bg-slate-100 text-slate-600"}`}>{entry.action}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-semibold">{entry.target}</span>
                {entry.detail ? <span className="text-muted"> · {entry.detail}</span> : null}
              </p>
              <p className="text-[11px] text-muted">
                {entry.userName} · {new Date(entry.at).toLocaleString("en-IN")}
              </p>
            </div>
            <span className="text-[11px] text-muted">{timeAgo(entry.at)}</span>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {adminLog.length === 0
              ? "No admin actions yet. Create, edit or moderate something and it will be logged here."
              : "No activity matches this search."}
          </p>
        ) : null}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          {pageNo > 1 ? (
            <Link
              href={`/admin/activity?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNo - 1) }).toString()}`}
              className="btn btn-ghost text-xs"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Page {pageNo} of {pages}
          </span>
          {pageNo < pages ? (
            <Link
              href={`/admin/activity?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNo + 1) }).toString()}`}
              className="btn btn-ghost text-xs"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
