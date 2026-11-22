import Link from "next/link";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const UNIT_KEYS = ["images", "videos", "words", "audio", "tasks"] as const;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("categories");
  const { saved, error } = await searchParams;
  const db = readDb();
  const categories = getCategories(db);
  const countFor = (slug: string) => db.ai.filter((a) => a.category === slug).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h2 className="display mt-1 text-2xl text-ink">Categories</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          Naye categories add karein (Health, Finance…), naam ya emoji badlein, ya khali category delete karein. Category
          jisme AI maujood hai use delete nahi kiya ja sakta — pehle un AI ko doosri category me move karein.
        </p>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Category list updated.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "inuse"
            ? "Ye category use ho rahi hai. Pehle un AI tools ko doosri category me move karein, phir delete karein."
            : "Category ka naam zaroori hai (aur slug unique hona chahiye)."}
        </div>
      ) : null}

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">All categories ({categories.length})</h3>
          <span className="text-[11px] text-muted">Public site aur AI Finder quiz dono yahi list use karte hain</span>
        </div>
        <div className="mt-2 divide-y divide-line">
          {categories.map((c) => {
            const used = countFor(c.slug);
            return (
              <details key={c.slug} className="py-2.5">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span aria-hidden>{c.emoji}</span>
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-[11px] text-muted">/{c.slug}</span>
                  <span className="chip bg-slate-100 text-slate-600">{used} tools</span>
                  <span className="ml-auto text-xs text-brand">Edit ▾</span>
                </summary>
                <form action={saveCategoryAction} className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="originalSlug" value={c.slug} />
                  <div>
                    <label className="label">Name</label>
                    <input name="name" defaultValue={c.name} required className="field" />
                  </div>
                  <div>
                    <label className="label">Slug</label>
                    <input name="slug" defaultValue={c.slug} className="field" />
                  </div>
                  <div>
                    <label className="label">Emoji</label>
                    <input name="emoji" defaultValue={c.emoji} maxLength={4} className="field" />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select name="unitKey" defaultValue={c.unit.key} className="field">
                      {UNIT_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Unit label</label>
                    <input name="unitLabel" defaultValue={c.unit.label} className="field" />
                  </div>
                  <div>
                    <label className="label">Default quantity</label>
                    <input name="defaultQty" type="number" min={1} defaultValue={c.unit.defaultQty} className="field" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Blurb</label>
                    <input name="blurb" defaultValue={c.blurb} className="field" />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <button className="btn btn-primary !py-1.5 text-xs">Save category</button>
                  </div>
                </form>
                <form action={deleteCategoryAction} className="mt-2">
                  <input type="hidden" name="slug" value={c.slug} />
                  {used > 0 ? (
                    <p className="text-[11px] text-muted">
                      Delete ke liye pehle {used} tools ko doosri category me move karein.
                    </p>
                  ) : (
                    <DeleteButton label="Delete category" message={`“${c.name}” category delete karni hai?`} />
                  )}
                </form>
              </details>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold">+ New category</h3>
        <form action={saveCategoryAction} className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label">Name *</label>
            <input name="name" required placeholder="Health" className="field" />
          </div>
          <div>
            <label className="label">Emoji</label>
            <input name="emoji" defaultValue="✨" maxLength={4} className="field" />
          </div>
          <div>
            <label className="label">Unit</label>
            <select name="unitKey" defaultValue="tasks" className="field">
              {UNIT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unit label</label>
            <input name="unitLabel" defaultValue="tasks / month" className="field" />
          </div>
          <div>
            <label className="label">Default quantity</label>
            <input name="defaultQty" type="number" min={1} defaultValue={50} className="field" />
          </div>
          <div>
            <label className="label">Blurb</label>
            <input name="blurb" placeholder="Health, fitness and medical AI tools." className="field" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary !py-1.5 text-xs">Create category</button>
          </div>
        </form>
      </section>

      <p className="text-[11px] text-muted">
        AI add karte waqt ye categories <Link href="/admin/ai/new" className="font-semibold text-brand">AI form</Link> me
        automatic dikhengi.
      </p>
    </div>
  );
}
