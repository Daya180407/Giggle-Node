import Link from "next/link";
import { moderatePromptAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { requireAreaPage } from "@/lib/permissions";
import { isVerifiedPrompt, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; ai?: string; page?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", filter = "community", ai: aiSlug = "all", page = "1" } = await searchParams;
  const db = readDb();
  const query = q.trim().toLowerCase();

  const aiById = new Map(db.ai.map((a) => [a.id, a]));
  const selectedAi = db.ai.find((a) => a.slug === aiSlug);
  const prompts = db.prompts ?? [];

  const filtered = prompts
    .filter((p) => (selectedAi ? p.aiId === selectedAi.id : true))
    .filter((p) => {
      const verified = isVerifiedPrompt(p);
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
    .sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  const community = prompts.filter((p) => p.submittedBy).length;
  const verified = prompts.filter((p) => isVerifiedPrompt(p)).length;
  const unverified = prompts.filter((p) => p.submittedBy && !isVerifiedPrompt(p)).length;
  const aiOptions = db.ai
    .filter((a) => prompts.some((p) => p.aiId === a.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const back = `/admin/prompts?${new URLSearchParams({
    ...(q ? { q } : {}),
    ...(filter !== "all" ? { filter } : {}),
    ...(selectedAi ? { ai: selectedAi.slug } : {}),
    page: String(pageNo),
  }).toString()}`;
  const pageHref = (nextPage: number) =>
    `/admin/prompts?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(filter !== "all" ? { filter } : {}),
      ...(selectedAi ? { ai: selectedAi.slug } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Prompt library</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Every prompt in the public library. Give a community prompt the verified tick once you have checked it, take
            the tick away if needed, or remove spam. Team prompts are verified by default.
          </p>
        </div>
        <Link href="/prompts" className="btn btn-ghost text-xs">
          View public library ↗
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "All prompts", value: prompts.length.toLocaleString("en-IN") },
          { label: "Community", value: community },
          { label: "Verified", value: verified },
          { label: "Community · unverified", value: unverified },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/prompts">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, prompt text, AI or contributor…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search prompts"
        />
        <select name="filter" defaultValue={filter} className="field !w-auto !py-2 text-xs" aria-label="Filter prompts">
          <option value="community">Community prompts</option>
          <option value="unverified">Community · unverified</option>
          <option value="verified">Verified only</option>
          <option value="all">All prompts</option>
        </select>
        <select name="ai" defaultValue={selectedAi?.slug ?? "all"} className="field !w-auto !py-2 text-xs" aria-label="Filter by AI">
          <option value="all">All AI tools</option>
          {aiOptions.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary !py-2 text-xs">Filter</button>
        {q || filter !== "community" || selectedAi ? (
          <Link href="/admin/prompts" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {rows.map((p) => {
          const ai = aiById.get(p.aiId);
          const verifiedPrompt = isVerifiedPrompt(p);
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
                    {p.submittedBy ? `Community · ${p.submittedByName || "a member"}` : "GigleNode team"}
                    {p.createdAt ? ` · ${timeAgo(p.createdAt)}` : ""}
                  </p>
                </div>
                <span
                  className={`chip ${verifiedPrompt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {verifiedPrompt ? "✓ Verified" : "Unverified"}
                </span>
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
                {ai ? (
                  <Link href={`/admin/ai/${ai.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                    Edit
                  </Link>
                ) : null}
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
          <p className="p-8 text-center text-sm text-muted">No prompts match these filters.</p>
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
    </div>
  );
}
