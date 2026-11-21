import { deleteModelAction, saveModelAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import type { Model } from "@/lib/types";

export default function ModelEditor({
  aiId,
  aiSlug,
  models,
  stats,
}: {
  aiId: string;
  aiSlug: string;
  models: Model[];
  stats: Record<string, { score: number; votes: number }>;
}) {
  return (
    <div className="space-y-3">
      {models.map((m) => {
        const s = stats[m.id];
        return (
          <details key={m.id} className="rounded-xl border border-line p-3">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
              <span>{m.name}</span>
              <span className="text-xs text-muted">
                {m.priceType} · {s ? `${s.score.toFixed(1)}★ (${s.votes} votes)` : "no votes"}
              </span>
              <span className="ml-auto text-xs text-brand">Edit ▾</span>
            </summary>

            <form action={saveModelAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="aiId" value={aiId} />
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
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="description" rows={2} defaultValue={m.description} className="field" />
              </div>
              <button className="btn btn-primary !py-1.5 text-xs">Save model</button>
            </form>

            <form action={deleteModelAction} className="mt-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="aiSlug" value={aiSlug} />
              <DeleteButton
                label="Delete model"
                message={`${m.name} aur uski saari ratings delete hongi. Pakka?`}
              />
            </form>
          </details>
        );
      })}

      <div className="rounded-xl border border-dashed border-line p-3">
        <h3 className="text-sm font-semibold">+ Naya model</h3>
        <form action={saveModelAction} className="mt-2 space-y-2">
          <input type="hidden" name="aiId" value={aiId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="Model naam (jaise GPT-5)" className="field" />
            <input name="bestFor" placeholder="Best for (jaise Daily tasks)" className="field" />
            <input name="launchDate" type="date" className="field" />
            <select name="priceType" defaultValue="freemium" className="field">
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <textarea name="description" rows={2} placeholder="Short description" className="field" />
          <button className="btn btn-ghost !py-1.5 text-xs">Add model</button>
        </form>
      </div>
    </div>
  );
}
