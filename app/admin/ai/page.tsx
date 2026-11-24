import Link from "next/link";
import { deleteAiAction, toggleAiFlagAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { AiLogo, Stars } from "@/components/ui";
import { categoryName, getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

export default async function AdminAiListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string; visibility?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", cat = "all", sort = "name", page = "1", visibility = "all" } = await searchParams;
  const db = readDb();
  const view = buildView(db);
  const categories = getCategories(db);
  const query = q.trim().toLowerCase();

  const all = [...view.aiStats.values()].filter((s) => {
    if (cat !== "all" && s.ai.category !== cat) return false;
    if (visibility === "hidden" && !s.ai.hidden) return false;
    if (visibility === "visible" && s.ai.hidden) return false;
    if (!query) return true;
    return [s.ai.name, s.ai.slug, s.ai.description, ...s.ai.bestFor].join(" ").toLowerCase().includes(query);
  });

  all.sort((a, b) => {
    if (sort === "score") return b.score - a.score || b.votes - a.votes;
    if (sort === "votes") return b.votes - a.votes;
    if (sort === "models") return b.models.length - a.models.length;
    if (sort === "newest") return +new Date(b.ai.createdAt) - +new Date(a.ai.createdAt);
    return a.ai.name.localeCompare(b.ai.name);
  });

  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = all.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const params = (nextPage: number) =>
    `/admin/ai?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(cat !== "all" ? { cat } : {}),
      ...(visibility !== "all" ? { visibility } : {}),
      ...(sort !== "name" ? { sort } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h2 className="display mt-1 text-2xl text-ink">AI & models</h2>
          <p className="mt-1 text-xs text-muted">
            {db.ai.length} tools · {db.models.length} models · {db.prompts.length} prompts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/sponsors" className="btn btn-ghost text-xs">
            Sponsorships
          </Link>
          <Link href="/admin/ai/new" className="btn btn-primary text-xs">
            + New AI
          </Link>
        </div>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/ai">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, use case…"
          className="field min-w-[180px] flex-1 !py-2 text-xs"
          aria-label="Search AI tools"
        />
        <select name="cat" defaultValue={cat} className="field !w-auto !py-2 text-xs" aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({db.ai.filter((a) => a.category === c.slug).length})
            </option>
          ))}
        </select>
        <select name="visibility" defaultValue={visibility} className="field !w-auto !py-2 text-xs" aria-label="Visibility">
          <option value="all">All visibility</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <select name="sort" defaultValue={sort} className="field !w-auto !py-2 text-xs" aria-label="Sort">
          <option value="name">Name A–Z</option>
          <option value="score">Highest score</option>
          <option value="votes">Most votes</option>
          <option value="models">Most models</option>
          <option value="newest">Newest</option>
        </select>
        <button className="btn btn-primary !py-2 text-xs">Apply</button>
        {q || cat !== "all" || sort !== "name" || visibility !== "all" ? (
          <Link href="/admin/ai" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">
          {all.length} {all.length === 1 ? "result" : "results"}
        </span>
      </form>

      <div className="card overflow-hidden">
        <p className="px-3 pt-2 text-[10.5px] text-muted lg:hidden">Swipe the table sideways to see every column →</p>
        <div className="admin-table-scroll">
        <table className="admin-table admin-table--sticky w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">AI</th>
              <th className="p-3">Category</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Votes</th>
              <th className="p-3">Models</th>
              <th className="p-3">Flags</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => (
              <tr key={s.ai.id} className="hover:bg-slate-50/60">
                <td className="p-3">
                  <Link href={`/admin/ai/${s.ai.slug}`} className="flex items-center gap-2 font-medium hover:text-brand">
                    <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={26} rounded="rounded-lg" />
                    <span className="min-w-0">
                      <span className="block truncate">{s.ai.name}</span>
                      <span className="block truncate text-[10.5px] font-normal text-muted">{s.ai.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="p-3">
                  <span className="chip bg-slate-100 text-slate-600">{categoryName(s.ai.category)}</span>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1.5">
                    <Stars value={s.score} size={11} />
                    <span className="text-xs font-semibold">{s.score.toFixed(1)}</span>
                  </span>
                </td>
                <td className="p-3 text-xs">{s.votes}</td>
                <td className="p-3 text-xs">{s.models.length}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {s.ai.hidden ? <span className="chip bg-rose-50 text-rose-600">Hidden</span> : null}
                    {s.ai.featured ? <span className="chip bg-indigo-50 text-indigo-700">Featured</span> : null}
                    {s.ai.sponsored ? <span className="chip bg-amber-50 text-amber-700">Sponsored</span> : null}
                    {(s.ai.platforms ?? []).map((p) => (
                      <span key={p} className="chip bg-slate-100 text-slate-600">
                        {p === "web" ? "Web" : p === "android" ? "Android" : "PC"}
                      </span>
                    ))}
                    {s.ai.boost > 0 ? <span className="chip bg-slate-100 text-slate-600">+{s.ai.boost.toFixed(2)}</span> : null}
                    {s.ai.plans?.length ? <span className="chip bg-emerald-50 text-emerald-700">{s.ai.plans.length} plans</span> : null}
                    {!s.ai.sponsored && s.ai.boost === 0 && !s.ai.hidden && !s.ai.featured ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : null}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/ai/${s.ai.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                      View
                    </Link>
                    <Link href={`/admin/ai/${s.ai.slug}`} className="btn btn-primary !px-2 !py-1 text-xs">
                      Edit
                    </Link>
                    <form action={toggleAiFlagAction}>
                      <input type="hidden" name="id" value={s.ai.id} />
                      <input type="hidden" name="flag" value="hidden" />
                      <input type="hidden" name="back" value="/admin/ai" />
                      <button className="btn btn-ghost !px-2 !py-1 text-xs">
                        {s.ai.hidden ? "Unhide" : "Hide"}
                      </button>
                    </form>
                    <form action={toggleAiFlagAction}>
                      <input type="hidden" name="id" value={s.ai.id} />
                      <input type="hidden" name="flag" value="featured" />
                      <input type="hidden" name="back" value="/admin/ai" />
                      <button className="btn btn-ghost !px-2 !py-1 text-xs">
                        {s.ai.featured ? "Unfeature" : "Feature"}
                      </button>
                    </form>
                    <form action={deleteAiAction}>
                      <input type="hidden" name="id" value={s.ai.id} />
                      <DeleteButton
                        label="Delete"
                        message={`Delete ${s.ai.name} and all of its models and ratings?`}
                      />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No AI tools match these filters.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Showing {all.length ? (pageNo - 1) * PER_PAGE + 1 : 0}–{Math.min(pageNo * PER_PAGE, all.length)} of {all.length} ·
          100 per page
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
