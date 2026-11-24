import { bulkDeleteAction, bulkEditAction, bulkUploadAction } from "@/app/actions";
import { getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminBulkPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; created?: string; skipped?: string; count?: string }>;
}) {
  await requireAreaPage("bulk");
  const { saved, error, created, skipped, count } = await searchParams;
  const db = readDb();
  const categories = getCategories(db);

  const seen = new Map<string, string[]>();
  for (const ai of db.ai) {
    const key = ai.name.trim().toLowerCase().replace(/\s+/g, " ");
    seen.set(key, [...(seen.get(key) ?? []), ai.slug]);
  }
  const duplicates = [...seen.entries()].filter(([, slugs]) => slugs.length > 1);

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h2 className="display mt-1 text-2xl text-ink">Bulk upload & edit</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Import hundreds of AI tools from a CSV, change prices for a whole category at once, or remove a batch.
          Duplicate names are skipped automatically.
        </p>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "upload"
            ? `Upload finished: ${created ?? "0"} tools added, ${skipped ?? "0"} skipped as blank or duplicate.`
            : saved === "edit"
              ? `${count ?? "0"} tools updated.`
              : `${count ?? "0"} tools deleted with their models and ratings.`}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "file"
            ? "Choose a CSV file first."
            : error === "large"
              ? "That CSV is larger than 3 MB. Split it into smaller files."
              : error === "empty"
                ? "The CSV needs a header row and at least one data row."
                : error === "confirm"
                  ? "Type DELETE in the confirmation box to run a bulk delete."
                  : error === "nothing"
                    ? "Choose at least one field to change."
                    : "Check the file and try again."}
        </div>
      ) : null}

      <form action={bulkUploadAction} className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Excel / CSV upload</h3>
            <p className="text-xs text-muted">UTF-8 CSV. The first row is the header.</p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">{db.ai.length} AI in catalogue</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="file">
              CSV file
            </label>
            <input id="file" name="file" type="file" accept=".csv,text/csv" className="field !py-2 text-xs" />
          </div>
          <button className="btn btn-primary !py-2 text-xs">Import catalogue</button>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <div className="admin-table-scroll">
          <table className="admin-table w-full text-[11px] sm:text-xs">
            <thead className="bg-slate-50/70 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-2">Column</th>
                <th className="p-2">Required</th>
                <th className="p-2">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-slate-600">
              {[
                ["name", "Yes", "Sora"],
                ["category", "Recommended (slug or name)", "video"],
                ["price_type", "No", "freemium"],
                ["plan_price", "No", "20 (USD)"],
                ["plan_price_inr", "No", "1999"],
                ["website", "No", "https://…"],
                ["description", "No", "Short description"],
                ["best_for", "No", "text to video; storyboards"],
                ["logo", "No", "🎬"],
                ["slug", "No", "auto from name"],
              ].map(([column, required, example]) => (
                <tr key={column}>
                  <td className="p-2 font-mono">{column}</td>
                  <td className="p-2">{required}</td>
                  <td className="p-2">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Each imported AI gets a “Standard” model so ratings work immediately. Unknown categories fall back to{" "}
          {categories[0]?.name}.
        </p>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        <form action={bulkEditAction} className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Bulk edit prices</h3>
          <p className="text-xs text-muted">Only filled fields are changed. Leave the rest blank.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="edit-category">
                Apply to category
              </label>
              <select id="edit-category" name="category" defaultValue="all" className="field !py-2 text-xs">
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="edit-price-type">
                New price type
              </label>
              <select id="edit-price-type" name="priceType" defaultValue="" className="field !py-2 text-xs">
                <option value="">Keep current</option>
                <option value="free">Free</option>
                <option value="freemium">Freemium</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="edit-inr">
                Starting plan ₹
              </label>
              <input id="edit-inr" name="planPriceInr" type="number" min={0} placeholder="e.g. 1999" className="field !py-2 text-xs" />
            </div>
            <div>
              <label className="label" htmlFor="edit-usd">
                Starting plan $ (USD)
              </label>
              <input id="edit-usd" name="planPrice" type="number" min={0} step="0.01" placeholder="e.g. 20" className="field !py-2 text-xs" />
            </div>
            <div>
              <label className="label" htmlFor="edit-boost">
                Manual boost (0–1)
              </label>
              <input id="edit-boost" name="boost" type="number" min={0} max={1} step="0.01" placeholder="0" className="field !py-2 text-xs" />
            </div>
          </div>
          <button className="btn btn-primary mt-3 !py-2 text-xs">Apply bulk edit</button>
        </form>

        <form action={bulkDeleteAction} className="card border-rose-200 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-rose-700">Bulk delete</h3>
          <p className="text-xs text-muted">
            Deletes the selected tools, their models, ratings, prompts, bookmarks and follows. This cannot be undone.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="delete-category">
                Delete category
              </label>
              <select id="delete-category" name="category" defaultValue={categories[0]?.slug ?? "all"} className="field !py-2 text-xs">
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
                <option value="all">⚠ All categories</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="delete-confirm">
                Type DELETE to confirm
              </label>
              <input id="delete-confirm" name="confirm" placeholder="DELETE" className="field !py-2 text-xs" />
            </div>
          </div>
          <button className="btn mt-3 !bg-rose-600 !py-2 text-xs text-white hover:!bg-rose-700">
            Delete matching tools
          </button>
        </form>
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Duplicate check</h3>
            <p className="text-xs text-muted">Same name appearing more than once in the catalogue.</p>
          </div>
          <span className={`chip ${duplicates.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {duplicates.length ? `${duplicates.length} duplicate names` : "No duplicates"}
          </span>
        </div>
        {duplicates.length ? (
          <ul className="mt-3 space-y-1.5 text-xs">
            {duplicates.map(([name, slugs]) => (
              <li key={name} className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
                <span className="font-semibold text-amber-900">{name}</span>
                <span className="text-amber-700">{slugs.join(", ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">Every tool name is unique. Uploads also skip duplicates automatically.</p>
        )}
      </section>
    </div>
  );
}
