import Link from "next/link";
import {
  deleteChangelogAction,
  restoreBackupAction,
  saveChangelogAction,
} from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminExportPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; restored?: string; error?: string }>;
}) {
  await requireAreaPage("settings");
  const { saved, restored, error } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const changelog = [...(db.changelog ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System</p>
          <h2 className="display mt-1 text-2xl text-ink">Backup, export & version</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Download everything, restore a snapshot, export ratings to Excel/CSV and publish a changelog to users.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{db.ai.length} AI</span>
          <span className="chip bg-slate-100 text-slate-600">{db.ratings.length} ratings</span>
          <span className="chip bg-slate-100 text-slate-600">{db.users.length} users</span>
        </div>
      </div>

      {restored ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Backup restored: {restored} AI tools loaded. Sign in again if a session looks stale.
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Changelog updated.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "confirm"
            ? "Type RESTORE in the confirmation box before restoring."
            : error === "file"
              ? "Choose a backup JSON file."
              : error === "large"
                ? "That file is larger than 8 MB."
                : error === "parse"
                  ? "That file is not valid JSON."
                  : error === "shape"
                    ? "This does not look like a GiggleNode backup (ai, ratings and users are required)."
                    : error === "changelog"
                      ? "Add a changelog title."
                      : "Check the file and try again."}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Full backup</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            One JSON file with the catalogue, models, ratings, posts, users, settings, categories, media library,
            notifications, outbox, feedback, points, cache and audit log. Password hashes and raw IP rate-limit events
            are excluded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/admin/export/download" className="btn btn-primary !py-2 text-xs">
              ⬇ Download full backup
            </a>
            <a href="/admin/export/ratings" className="btn btn-ghost !py-2 text-xs">
              ⬇ Export ratings (CSV)
            </a>
          </div>
          <div className="mt-3 rounded-xl border border-line bg-slate-50/60 p-3 text-[11px] leading-relaxed text-slate-600">
            Restoring keeps your current admin password. Accounts that exist in both the backup and the live site keep
            their password. Backups are stored only where you save them.
          </div>
        </section>

        <form action={restoreBackupAction} className="card border-amber-200 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-amber-900">Restore a backup</h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            This replaces the current catalogue, ratings, posts, users, settings and media with the file. Take a fresh
            backup first.
          </p>
          <div className="mt-3 grid gap-2">
            <div>
              <label className="label" htmlFor="backup-file">
                Backup JSON
              </label>
              <input id="backup-file" name="file" type="file" accept="application/json,.json" className="field !py-2 text-xs" />
            </div>
            <div>
              <label className="label" htmlFor="restore-confirm">
                Type RESTORE to confirm
              </label>
              <input id="restore-confirm" name="confirm" placeholder="RESTORE" className="field !py-2 text-xs" />
            </div>
          </div>
          <button className="btn mt-3 !bg-amber-600 !py-2 text-xs text-white hover:!bg-amber-700">
            Restore backup
          </button>
        </form>
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Changelog</h3>
            <p className="text-xs text-muted">
              Published entries appear on <Link href="/changelog" className="font-semibold text-brand">/changelog</Link>{" "}
              when the changelog is enabled in Notifications & email.
            </p>
          </div>
          <span className={`chip ${settings.changelogEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {settings.changelogEnabled ? "Public changelog on" : "Changelog off"}
          </span>
        </div>

        <form action={saveChangelogAction} className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="cl-version">
              Version
            </label>
            <input id="cl-version" name="version" placeholder="v1.4" maxLength={24} className="field !py-2 text-xs" />
          </div>
          <div>
            <label className="label" htmlFor="cl-title">
              Title
            </label>
            <input
              id="cl-title"
              name="title"
              required
              maxLength={120}
              placeholder="AI search, media library and new admin controls"
              className="field !py-2 text-xs"
            />
          </div>
          <button className="btn btn-primary !py-2 text-xs">Publish entry</button>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="cl-body">
              What changed
            </label>
            <textarea id="cl-body" name="body" rows={3} maxLength={3000} className="field text-xs" />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-3">
            <input type="checkbox" name="published" defaultChecked className="h-4 w-4 accent-indigo-600" />
            Published (visible to users)
          </label>
        </form>

        <div className="mt-3 divide-y divide-line">
          {changelog.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-start gap-2 py-3">
              <span className="chip bg-brand-soft text-brand">{entry.version}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">{entry.title}</p>
                <p className="text-[11px] text-muted">
                  {new Date(entry.at).toLocaleDateString("en-IN")} · {entry.published ? "published" : "draft"}
                </p>
                {entry.body ? <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{entry.body}</p> : null}
              </div>
              <form action={deleteChangelogAction}>
                <input type="hidden" name="id" value={entry.id} />
                <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
              </form>
            </div>
          ))}
          {changelog.length === 0 ? <p className="py-4 text-xs text-muted">No changelog entries yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
