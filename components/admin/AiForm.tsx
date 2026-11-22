import { saveAiAction } from "@/app/actions";
import PlanFields from "@/components/admin/PlanFields";
import { getCategories } from "@/lib/categories";
import { readDb } from "@/lib/store";
import type { Ai, Platform } from "@/lib/types";

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "web", label: "Website" },
  { key: "android", label: "Android app" },
  { key: "pc", label: "PC software" },
];

export default function AiForm({ ai, allAis }: { ai?: Ai; allAis: Ai[] }) {
  const categories = getCategories(readDb());
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
            {categories.map((c) => (
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
          <label className="label" htmlFor="startPrice">
            Starting plan ($/month)
          </label>
          <input
            id="startPrice"
            name="startPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={ai?.planPrice ?? 0}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="startPriceInr">
            Starting plan (₹/month)
          </label>
          <input
            id="startPriceInr"
            name="startPriceInr"
            type="number"
            min={0}
            step="1"
            defaultValue={ai?.planPriceInr ?? 0}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pros">
            Pros (ek line me ek)
          </label>
          <textarea
            id="pros"
            name="pros"
            rows={4}
            defaultValue={ai?.pros.join("\n")}
            placeholder={"Strong writing quality\nFast responses\nGood free plan"}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="cons">
            Cons (ek line me ek)
          </label>
          <textarea
            id="cons"
            name="cons"
            rows={4}
            defaultValue={ai?.cons.join("\n")}
            placeholder={"Paid plan needed for heavy use\nOccasional wrong answers"}
            className="field"
          />
        </div>
      </div>

      <PlanFields
        plans={ai?.plans ?? []}
        hint="Yahan plans add karte hi public AI page aur app listing par plan cards dikhne lagte hain. Price galat hone par users report kar sakte hain aur report admin panel ke Pricing Reports me aati hai."
      />

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea id="description" name="description" rows={4} defaultValue={ai?.description} className="field" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Available on</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {PLATFORMS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="platforms"
                  value={p.key}
                  defaultChecked={(ai?.platforms ?? ["web"]).includes(p.key)}
                  className="h-4 w-4 accent-indigo-600"
                />
                {p.label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Visitor ko batata hai ki tool app hai, PC software hai ya website.</p>
        </fieldset>
        <div>
          <label className="label" htmlFor="affiliateUrl">
            Affiliate link (Visit button)
          </label>
          <input
            id="affiliateUrl"
            name="affiliateUrl"
            defaultValue={ai?.affiliateUrl ?? ""}
            placeholder="https://partner.example.com/ref=giglenode"
            className="field"
          />
          <p className="mt-1 text-[11px] text-muted">
            Khali chhodne par official website use hogi. Commission link yahan lagayein.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sponsored" defaultChecked={ai?.sponsored} className="h-4 w-4 accent-indigo-600" />
          Sponsored listing (label dikhega)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={ai?.featured} className="h-4 w-4 accent-indigo-600" />
          Featured / Champion
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hidden" defaultChecked={ai?.hidden} className="h-4 w-4 accent-rose-600" />
          Hide from public site (ratings safe rahengi)
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
