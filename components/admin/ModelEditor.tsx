import { deleteModelAction, saveModelAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { getApiPricing } from "@/lib/api-pricing";
import { categoryName, getCategories, modelCategories } from "@/lib/categories";
import { readDb } from "@/lib/store";
import type { Ai, Model } from "@/lib/types";

const UNITS = ["1M tokens", "image", "second", "1M characters", "track", "request"];

function CategoryPicker({
  categories,
  selected,
  hint,
}: {
  categories: { slug: string; name: string; emoji: string }[];
  selected: string[];
  hint: string;
}) {
  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="categoriesSubmitted" value="on" />
      <label className="label">Categories (what this model is good at)</label>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-line bg-white p-2 text-xs">
        {categories.map((c) => (
          <label key={c.slug} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="categories"
              value={c.slug}
              defaultChecked={selected.includes(c.slug)}
              className="h-3.5 w-3.5 accent-indigo-600"
            />
            <span>
              {c.emoji} {c.name}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

export default function ModelEditor({
  ai,
  aiSlug,
  models,
  stats,
}: {
  ai: Ai;
  aiSlug: string;
  models: Model[];
  stats: Record<string, { score: number; votes: number }>;
}) {
  const categories = getCategories(readDb());
  return (
    <div className="space-y-3">
      {models.map((m) => {
        const s = stats[m.id];
        const pricing = m.pricing ?? getApiPricing(ai, m);
        return (
          <details key={m.id} className="rounded-xl border border-line p-3">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
              <span>{m.name}</span>
              <span className="text-xs text-muted">
                {m.priceType} · {s ? `${s.score.toFixed(1)}★ (${s.votes} votes)` : "no votes"}
              </span>
              {m.pin ? <span className="chip bg-indigo-50 text-indigo-700">Top</span> : null}
              {m.editorRating ? <span className="chip bg-amber-50 text-amber-700">Editor {m.editorRating}★</span> : null}
              {m.pricing ? <span className="chip bg-emerald-50 text-emerald-700">Custom API price</span> : null}
              <span className="ml-auto text-xs text-brand">Edit ▾</span>
            </summary>

            <form action={saveModelAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="aiId" value={ai.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="label">Model naam</label>
                  <input name="name" defaultValue={m.name} className="field" />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input name="slug" defaultValue={m.slug} className="field" />
                </div>
                <div>
                  <label className="label">Best for</label>
                  <input name="bestFor" defaultValue={m.bestFor} className="field" />
                </div>
                <div>
                  <label className="label">Launch date</label>
                  <input name="launchDate" type="date" defaultValue={m.launchDate} className="field" />
                </div>
                <div>
                  <label className="label">Price</label>
                  <select name="priceType" defaultValue={m.priceType} className="field">
                    <option value="free">Free</option>
                    <option value="freemium">Freemium</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="label">Editor rating (1–5)</label>
                  <input
                    name="editorRating"
                    type="number"
                    min={1}
                    max={5}
                    step="0.1"
                    defaultValue={m.editorRating ?? ""}
                    className="field"
                    placeholder="optional"
                  />
                </div>
                <label className="flex items-center gap-2 self-end text-sm">
                  <input type="checkbox" name="pin" defaultChecked={m.pin} className="h-4 w-4 accent-indigo-600" />
                  Pin this model to the top
                </label>
                <CategoryPicker
                  categories={categories}
                  selected={modelCategories(m, ai)}
                  hint={`Tick every job this model handles. Blank = follow the tool's category (${categoryName(ai.category)}).`}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="description" rows={2} defaultValue={m.description} className="field" />
              </div>

              <fieldset className="rounded-xl border border-line bg-slate-50/60 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  API / model pricing
                </legend>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="pricingCustom"
                    defaultChecked={Boolean(m.pricing)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Use custom pricing (otherwise the curated/indicative rate)
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="label">Input / base price (USD)</label>
                    <input
                      name="pricingInput"
                      type="number"
                      min={0}
                      step="0.0001"
                      defaultValue={pricing.input ?? ""}
                      className="field !py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Output price (USD)</label>
                    <input
                      name="pricingOutput"
                      type="number"
                      min={0}
                      step="0.0001"
                      defaultValue={pricing.output ?? ""}
                      className="field !py-1.5 text-xs"
                      placeholder="blank = not billed"
                    />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select name="pricingUnit" defaultValue={pricing.unit} className="field !py-1.5 text-xs">
                      {UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Context window (tokens)</label>
                    <input
                      name="pricingContext"
                      type="number"
                      min={0}
                      step="1000"
                      defaultValue={pricing.contextWindow ?? ""}
                      className="field !py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Official pricing page</label>
                    <input
                      name="pricingSource"
                      defaultValue={m.pricing?.source ?? ""}
                      placeholder="https://provider.com/pricing"
                      className="field !py-1.5 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end text-sm">
                    <input
                      type="checkbox"
                      name="pricingAvailable"
                      defaultChecked={pricing.available}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Public API available
                  </label>
                </div>
                <div className="mt-2">
                  <label className="label">Pricing note</label>
                  <input
                    name="pricingNote"
                    defaultValue={m.pricing?.note ?? ""}
                    placeholder="e.g. Batch API is 50% cheaper"
                    className="field !py-1.5 text-xs"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  A custom price appears on the public page as “admin verified”. Users can report a wrong price.
                </p>
              </fieldset>

              <button className="btn btn-primary !py-1.5 text-xs">Save model</button>
            </form>

            <form action={deleteModelAction} className="mt-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="aiSlug" value={aiSlug} />
              <DeleteButton
                label="Delete model"
                message={`Delete ${m.name} and all of its ratings?`}
              />
            </form>
          </details>
        );
      })}

      <div className="rounded-xl border border-dashed border-line p-3">
        <h3 className="text-sm font-semibold">+ Naya model</h3>
        <form action={saveModelAction} className="mt-2 space-y-2">
          <input type="hidden" name="aiId" value={ai.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="Model naam (jaise GPT-5)" className="field" />
            <input name="bestFor" placeholder="Best for (jaise Daily tasks)" className="field" />
            <input name="launchDate" type="date" className="field" />
            <select name="priceType" defaultValue="freemium" className="field">
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
            <input name="editorRating" type="number" min={1} max={5} step="0.1" placeholder="Editor rating (optional)" className="field" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="pin" className="h-4 w-4 accent-indigo-600" />
              Top par dikhao
            </label>
            <CategoryPicker
              categories={categories}
              selected={[ai.category]}
              hint={`Tick every job this model handles. Blank = follow the tool's category (${categoryName(ai.category)}).`}
            />
          </div>
          <textarea name="description" rows={2} placeholder="Short description" className="field" />
          <button className="btn btn-ghost !py-1.5 text-xs">Add model</button>
        </form>
      </div>
    </div>
  );
}
