import Link from "next/link";
import { moderatePromptAction, reviewPromptReportAction, savePromptAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { requireAreaPage } from "@/lib/permissions";
import { isVerifiedPrompt, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 60;

type Tab = "all" | "admin" | "community" | "unverified" | "verified" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All prompts" },
  { key: "admin", label: "Team added" },
  { key: "community", label: "User added" },
  { key: "unverified", label: "User · unverified" },
  { key: "verified", label: "Verified" },
  { key: "reports", label: "Reports" },
];

export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; ai?: string; page?: string; saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", filter: filterRaw = "all", ai: aiSlug = "all", page = "1", saved } = await searchParams;
  const filter = (TABS.some((tab) => tab.key === filterRaw) ? filterRaw : "all") as Tab;
  const db = readDb();
  const query = q.trim().toLowerCase();

  const aiById = new Map(db.ai.map((a) => [a.id, a]));
  const selectedAi = db.ai.find((a) => a.slug === aiSlug);
  const prompts = db.prompts ?? [];
  const reports = db.promptReports ?? [];
  const openReports = reports.filter((report) => report.status === "open");
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));

  const filtered = prompts
    .filter((p) => (selectedAi ? p.aiId === selectedAi.id : true))
    .filter((p) => {
      const verified = isVerifiedPrompt(p);
      if (filter === "admin") return !p.submittedBy;
      if (filter === "community") return Boolean(p.submittedBy);
      if (filter === "unverified") return Boolean(p.submittedBy) && !verified;
      if (filter === "verified") return verified;
      return true;
    })
    .filter((p) => {
      if (!query) return true;
      const aiName = aiById.get(p.aiId)?.name ?? "";
      return [p.title, p.promptText, aiName, p.submittedByName].filter(Boolean).join(" ").toLowerCase().includes(query);
    })
    .sort(
      (a, b) =>
        Number(isVerifiedPrompt(b)) - Number(isVerifiedPrompt(a)) ||
        +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0),
    );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  const team = prompts.filter((p) => !p.submittedBy).length;
  const community = prompts.filter((p) => p.submittedBy).length;
  const verified = prompts.filter((p) => isVerifiedPrompt(p)).length;
  const unverified = prompts.filter((p) => p.submittedBy && !isVerifiedPrompt(p)).length;
  const aiOptions = db.ai
    .filter((a) => prompts.some((p) => p.aiId === a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const params = (extra: Record<string, string | undefined>) =>
    new URLSearchParams({
      ...(q ? { q } : {}),
      ...(filter !== "all" ? { filter } : {}),
      ...(selectedAi ? { ai: selectedAi.slug } : {}),
      ...extra,
    }).toString();
  const back = `/admin/prompts?${params({ page: String(pageNo) })}`;
  const pageHref = (nextPage: number) => `/admin/prompts?${params({ page: String(nextPage) })}`;
  const tabHref = (key: Tab) =>
    `/admin/prompts?${new URLSearchParams({ ...(q ? { q } : {}), ...(selectedAi ? { ai: selectedAi.slug } : {}), ...(key !== "all" ? { filter: key } : {}) }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Prompt library</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Every prompt in the public library, split into team prompts and prompts added by users. Edit or delete any
            prompt here, give a user prompt the verified tick once checked, and review member reports.
          </p>
        </div>
        <Link href="/prompts" className="btn btn-ghost text-xs">
          View public library ↗
        </Link>
      </div>

      {saved === "edited" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Prompt updated. The public library shows the new text.
        </div>
      ) : null}
      {saved === "report" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Report handled.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "All prompts", value: prompts.length.toLocaleString("en-IN") },
          { label: "Team added", value: team.toLocaleString("en-IN") },
          { label: "User added", value: community.toLocaleString("en-IN") },
          { label: "Open reports", value: openReports.length.toLocaleString("en-IN") },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Prompt library tabs">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? prompts.length
              : tab.key === "admin"
                ? team
                : tab.key === "community"
                  ? community
                  : tab.key === "verified"
                    ? verified
                    : tab.key === "unverified"
                      ? unverified
                      : openReports.length;
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              aria-current={filter === tab.key ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.key
                  ? "border-transparent bg-ink text-white"
                  : "border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${filter === tab.key ? "text-white/70" : "text-slate-400"}`}>{count}</span>
            </Link>
          );
        })}
      </nav>

      {filter !== "reports" ? (
        <>
          <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/prompts">
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search title, prompt text, AI or contributor…"
              className="field min-w-[220px] flex-1 !py-2 text-xs"
              aria-label="Search prompts"
            />
            <select name="ai" defaultValue={selectedAi?.slug ?? "all"} className="field !w-auto !py-2 text-xs" aria-label="Filter by AI">
              <option value="all">All AI tools</option>
              {aiOptions.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary !py-2 text-xs">Filter</button>
            {q || selectedAi ? (
              <Link href={`/admin/prompts${filter !== "all" ? `?filter=${filter}` : ""}`} className="btn btn-ghost !py-2 text-xs">
                Reset
              </Link>
            ) : null}
            <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
          </form>

          <div className="card divide-y divide-line">
            {rows.map((p) => {
              const ai = aiById.get(p.aiId);
              const verifiedPrompt = isVerifiedPrompt(p);
              const promptReports = reports.filter((report) => report.promptId === p.id && report.status === "open");
              return (
                <div key={p.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="truncate text-xs text-muted">
                        {ai ? (
                          <Link href={`/ai/${ai.slug}#prompts`} className="font-medium text-slate-600 hover:text-brand">
                            {ai.name}
                          </Link>
                        ) : (
                          "unknown AI"
                        )}
                        {" · "}
                        {p.submittedBy ? `User added · ${p.submittedByName || "a member"}` : "Team added"}
                        {p.createdAt ? ` · ${timeAgo(p.createdAt)}` : ""}
                      </p>
                    </div>
                    {promptReports.length ? (
                      <span className="chip bg-rose-50 text-rose-600">⚑ {promptReports.length} report</span>
                    ) : null}
                    <span
                      className={`chip ${verifiedPrompt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {verifiedPrompt ? "✓ Verified" : "Unverified"}
                    </span>
                    <details className="w-full sm:w-auto">
                      <summary className="btn btn-ghost !px-2 !py-1 text-xs">Edit ✎</summary>
                      <form action={savePromptAction} className="mt-2 space-y-2 rounded-xl border border-line bg-slate-50/70 p-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="aiId" value={p.aiId} />
                        <input type="hidden" name="aiSlug" value={ai?.slug ?? ""} />
                        <input type="hidden" name="back" value={back} />
                        <input name="title" defaultValue={p.title} required maxLength={80} className="field !py-1.5 text-xs" />
                        <textarea
                          name="promptText"
                          defaultValue={p.promptText}
                          required
                          rows={4}
                          maxLength={2000}
                          className="field !py-1.5 text-xs"
                        />
                        <button className="btn btn-primary !py-1.5 text-xs">Save prompt</button>
                      </form>
                    </details>
                    <form action={moderatePromptAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="intent" value={verifiedPrompt ? "unverify" : "verify"} />
                      <button
                        className={`btn !px-2 !py-1 text-xs ${
                          verifiedPrompt
                            ? "btn-ghost text-slate-600"
                            : "!border !border-emerald-200 !bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {verifiedPrompt ? "Remove tick" : "✓ Verify"}
                      </button>
                    </form>
                    <form action={moderatePromptAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="intent" value="delete" />
                      <DeleteButton label="Delete" message="Delete this prompt from the library?" />
                    </form>
                  </div>
                  <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs text-slate-600">{p.promptText}</p>
                </div>
              );
            })}
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">
                No prompts match these filters. Switch to “All prompts” to see the whole library.
              </p>
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
                  <Link href={pageHref(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                    ← Prev
                  </Link>
                ) : null}
                <span className="px-1 text-xs text-muted">
                  {pageNo} / {pages}
                </span>
                {pageNo < pages ? (
                  <Link href={pageHref(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                    Next →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <section className="card divide-y divide-line">
          <div className="p-3">
            <h3 className="text-sm font-bold">Member reports</h3>
            <p className="text-xs text-muted">
              A user can report a prompt as harmful, spam or broken. Review it, then keep it, dismiss the report or
              delete the prompt.
            </p>
          </div>
          {openReports.map((report) => {
            const prompt = promptById.get(report.promptId);
            const ai = prompt ? aiById.get(prompt.aiId) : undefined;
            return (
              <div key={report.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-rose-50 text-rose-600">⚑ {report.reason}</span>
                  <span className="text-[11px] text-muted">
                    {report.userName} · {timeAgo(report.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold">{prompt?.title ?? "Deleted prompt"}</p>
                <p className="text-[11px] text-muted">{ai?.name ?? "unknown AI"}</p>
                {prompt ? (
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                    {prompt.promptText.slice(0, 600)}
                  </p>
                ) : null}
                {report.note ? (
                  <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">“{report.note}”</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={reviewPromptReportAction}>
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="promptId" value={report.promptId} />
                    <input type="hidden" name="intent" value="resolve" />
                    <input type="hidden" name="back" value="/admin/prompts?filter=reports" />
                    <button className="btn btn-ghost !px-2 !py-1 text-xs">Keep prompt</button>
                  </form>
                  <form action={reviewPromptReportAction}>
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="intent" value="dismiss" />
                    <input type="hidden" name="back" value="/admin/prompts?filter=reports" />
                    <button className="btn btn-ghost !px-2 !py-1 text-xs">Dismiss</button>
                  </form>
                  {prompt ? (
                    <form action={reviewPromptReportAction}>
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="promptId" value={report.promptId} />
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="back" value="/admin/prompts?filter=reports" />
                      <DeleteButton label="Delete prompt" message="Delete this prompt and close its reports?" />
                    </form>
                  ) : null}
                  {prompt && ai ? (
                    <Link href={`/ai/${ai.slug}#prompts`} className="btn btn-ghost !px-2 !py-1 text-xs">
                      Open listing ↗
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
          {openReports.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">No open reports. Reported prompts appear here.</p>
          ) : null}

          {reports.some((report) => report.status !== "open") ? (
            <details className="p-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-brand">
                Handled reports ({reports.filter((report) => report.status !== "open").length})
              </summary>
              <div className="mt-2 divide-y divide-line">
                {reports
                  .filter((report) => report.status !== "open")
                  .slice(0, 40)
                  .map((report) => (
                    <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                      <span className="font-medium text-ink">{promptById.get(report.promptId)?.title ?? "deleted"}</span>
                      <span className="text-muted">{report.reason}</span>
                      <span className={`chip ${report.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {report.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {report.reviewedBy ?? "—"} · {(report.reviewedAt ?? report.createdAt).slice(0, 10)}
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          ) : null}
        </section>
      )}
    </div>
  );
}
