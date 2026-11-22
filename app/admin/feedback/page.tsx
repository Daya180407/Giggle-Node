import Link from "next/link";
import {
  deleteFeedbackAction,
  setFeedbackStatusAction,
} from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const KINDS = [
  { value: "all", label: "All" },
  { value: "contact", label: "Messages" },
  { value: "feature", label: "Feature requests" },
  { value: "bug", label: "Bug reports" },
];

const STATUSES = ["all", "new", "approved", "done", "rejected"];

const KIND_TONE: Record<string, string> = {
  contact: "bg-slate-100 text-slate-600",
  feature: "bg-indigo-50 text-indigo-700",
  bug: "bg-rose-50 text-rose-600",
};

const STATUS_TONE: Record<string, string> = {
  new: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  done: "bg-slate-100 text-slate-600",
  rejected: "bg-rose-50 text-rose-600",
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string; saved?: string }>;
}) {
  await requireAreaPage("feedback");
  const { kind: kindParam, status: statusParam, saved } = await searchParams;
  const kind = KINDS.some((row) => row.value === kindParam) ? kindParam! : "all";
  const status = STATUSES.includes(statusParam ?? "") ? statusParam! : "all";
  const db = readDb();
  const all = db.feedback ?? [];
  const rows = all.filter(
    (row) => (kind === "all" || row.kind === kind) && (status === "all" || row.status === status),
  );
  const counts = {
    new: all.filter((row) => row.status === "new").length,
    features: all.filter((row) => row.kind === "feature").length,
    bugs: all.filter((row) => row.kind === "bug").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Feedback & contact</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Every message from the public contact form, feature request and bug report lands here. Approve a request,
            then add the tool from the catalogue.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${counts.new ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {counts.new} new
          </span>
          <span className="chip bg-indigo-50 text-indigo-700">{counts.features} feature requests</span>
          <span className="chip bg-rose-50 text-rose-600">{counts.bugs} bug reports</span>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Feedback updated.
        </div>
      ) : null}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        {KINDS.map((row) => (
          <Link
            key={row.value}
            href={`/admin/feedback?kind=${row.value}&status=${status}`}
            className={`chip ${
              kind === row.value ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {row.label}
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {STATUSES.map((row) => (
          <Link
            key={row}
            href={`/admin/feedback?kind=${kind}&status=${row}`}
            className={`chip ${
              status === row ? "bg-brand-soft text-brand" : "bg-white text-slate-500 ring-1 ring-line hover:text-brand"
            }`}
          >
            {row}
          </Link>
        ))}
        <span className="ml-auto text-[11px] text-muted">{rows.length} shown</span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`chip ${KIND_TONE[row.kind]}`}>{row.kind}</span>
              <span className={`chip ${STATUS_TONE[row.status]}`}>{row.status}</span>
              <span className="text-[11px] text-muted">{new Date(row.createdAt).toLocaleString("en-IN")}</span>
              <span className="ml-auto flex items-center gap-2">
                {row.kind === "feature" ? (
                  <Link href="/admin/ai/new" className="text-[11px] font-semibold text-brand hover:underline">
                    Add to catalogue →
                  </Link>
                ) : null}
                <form action={deleteFeedbackAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
                </form>
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{row.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="font-semibold text-slate-600">{row.name}</span>
              <a href={`mailto:${row.email}`} className="text-brand hover:underline">
                {row.email}
              </a>
              {row.page ? <span>from {row.page}</span> : null}
              {row.screenshot ? (
                <a href={row.screenshot} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                  Open screenshot ↗
                </a>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
              {(["approved", "done", "rejected", "new"] as const).map((next) => (
                <form action={setFeedbackStatusAction} key={next}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value={next} />
                  <button
                    className={`chip ${
                      next === row.status ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {next}
                  </button>
                </form>
              ))}
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-2xl" aria-hidden>
              📬
            </p>
            <p className="mt-1 text-sm text-slate-600">No feedback in this view yet.</p>
            <Link href="/contact" className="btn btn-ghost mt-3 text-xs">
              Open the public contact form
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
