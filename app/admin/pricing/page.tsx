import Link from "next/link";
import { deletePricingReportAction, setPricingReportStatusAction } from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "open", "fixed", "dismissed"] as const;

const STATUS_TONE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  fixed: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-500",
};

export default async function AdminPricingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { status: statusParam, saved } = await searchParams;
  const status = STATUSES.includes((statusParam ?? "all") as (typeof STATUSES)[number])
    ? (statusParam ?? "all")
    : "all";
  const db = readDb();
  const all = db.pricingReports ?? [];
  const rows = all.filter((row) => status === "all" || row.status === status);
  const open = all.filter((row) => row.status === "open").length;

  const editHref = (row: (typeof all)[number]) => {
    if (row.targetType === "app") return `/admin/apps/${row.targetId}`;
    if (row.targetType === "model") {
      const model = db.models.find((m) => m.id === row.targetId || m.slug === row.targetId);
      const ai = model ? db.ai.find((a) => a.id === model.aiId) : undefined;
      return ai ? `/admin/ai/${ai.slug}#models` : "/admin/ai";
    }
    const ai = db.ai.find((a) => a.id === row.targetId || a.slug === row.targetId);
    return ai ? `/admin/ai/${ai.slug}#plans` : "/admin/ai";
  };

  const targetLabel = (row: (typeof all)[number]) => {
    if (row.targetType === "model") return "Model API price";
    if (row.targetType === "app") return "App subscription";
    return "AI plan / API price";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h2 className="display mt-1 text-2xl text-ink">Pricing reports</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Users report incorrect plan or API/model prices. Open the correct edit page from here, fix the price, then
            mark the report as “fixed”.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${open ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {open} open
          </span>
          <span className="chip bg-slate-100 text-slate-600">{all.length} total</span>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Report updated.
        </div>
      ) : null}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        {STATUSES.map((row) => (
          <Link
            key={row}
            href={`/admin/pricing?status=${row}`}
            className={`chip ${status === row ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {row}
          </Link>
        ))}
        <Link href="/admin/apps" className="btn btn-ghost ml-auto !py-1.5 text-xs">
          App pricing →
        </Link>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand">{targetLabel(row)}</span>
              <span className={`chip ${STATUS_TONE[row.status]}`}>{row.status}</span>
              <span className="text-[11px] font-semibold text-slate-600">{row.targetName}</span>
              <span className="text-[11px] text-muted">{new Date(row.createdAt).toLocaleString("en-IN")}</span>
              <Link
                href={editHref(row)}
                className="ml-auto text-[11px] font-semibold text-brand hover:underline"
              >
                Fix price →
              </Link>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{row.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="font-semibold text-slate-600">{row.userName}</span>
              {row.email ? (
                <a href={`mailto:${row.email}`} className="text-brand hover:underline">
                  {row.email}
                </a>
              ) : (
                <span>no email</span>
              )}
              <span>id: {row.targetId}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
              {(["fixed", "dismissed", "open"] as const).map((next) => (
                <form action={setPricingReportStatusAction} key={next}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value={next} />
                  <button
                    className={`chip ${next === row.status ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    mark {next}
                  </button>
                </form>
              ))}
              <form action={deletePricingReportAction} className="ml-auto">
                <input type="hidden" name="id" value={row.id} />
                <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
              </form>
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-2xl" aria-hidden>
              💰
            </p>
            <p className="mt-1 text-sm text-slate-600">No pricing reports in this view yet.</p>
            <p className="mt-1 text-xs text-muted">
              Reports come from the “Wrong price? Report it” form on public AI, model and app pages.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
