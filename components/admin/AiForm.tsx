import { saveAiAction } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";
import type { Ai } from "@/lib/types";

export default function AiForm({ ai, allAis }: { ai?: Ai; allAis: Ai[] }) {
  return (
    <form action={saveAiAction} className="space-y-3">
      {ai ? <input type="hidden" name="id" value={ai.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Naam *
          </label>
          <input id="name" name="name" required defaultValue={ai?.name} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="slug">
            Slug (khali chhodiye = auto)
          </label>
          <input id="slug" name="slug" defaultValue={ai?.slug} className="field" placeholder="chatgpt" />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" defaultValue={ai?.category ?? "writing"} className="field">
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="priceType">
            Price type
          </label>
          <select id="priceType" name="priceType" defaultValue={ai?.priceType ?? "freemium"} className="field">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="website">
            Official website
          </label>
          <input id="website" name="website" defaultValue={ai?.website} className="field" placeholder="https://" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="logo">
              Logo emoji
            </label>
            <input id="logo" name="logo" defaultValue={ai?.logo ?? "🤖"} maxLength={4} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="color">
              Brand colour
            </label>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={ai?.color ?? "#4F46E5"}
              className="field h-11 p-1"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="planPrice">
            Starting plan ($/month)
          </label>
          <input
            id="planPrice"
            name="planPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={ai?.planPrice ?? 0}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="unitCost">
            Cost per unit ($)
          </label>
          <input
            id="unitCost"
            name="unitCost"
            type="number"
            min={0}
            step="0.001"
            defaultValue={ai?.unitCost ?? 0}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="freeAlternativeId">
            Free alternative
          </label>
          <select
            id="freeAlternativeId"
            name="freeAlternativeId"
            defaultValue={ai?.freeAlternativeId ?? ""}
            className="field"
          >
            <option value="">— none —</option>
            {allAis
              .filter((a) => a.id !== ai?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bestFor">
            Best for (comma separated)
          </label>
          <input
            id="bestFor"
            name="bestFor"
            defaultValue={ai?.bestFor.join(", ")}
            className="field"
            placeholder="Writing, Coding, Research"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea id="description" name="description" rows={4} defaultValue={ai?.description} className="field" />
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sponsored" defaultChecked={ai?.sponsored} className="h-4 w-4 accent-indigo-600" />
          Sponsored listing (label dikhega)
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor="boost">
            Ranking boost
          </label>
          <input
            id="boost"
            name="boost"
            type="number"
            step="0.01"
            min={0}
            max={1}
            defaultValue={ai?.boost ?? 0}
            className="field !w-24 !py-1"
          />
          <span className="text-xs text-muted">0–1 (page pe disclose hota hai)</span>
        </div>
      </div>

      <button className="btn btn-primary">{ai ? "Save changes" : "Create AI"}</button>
    </form>
  );
}
