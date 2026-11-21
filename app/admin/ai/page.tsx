import Link from "next/link";
import { deleteAiAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Stars } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminAiListPage() {
  const db = readDb();
  const view = buildView(db);
  const stats = [...view.aiStats.values()].sort((a, b) => a.ai.name.localeCompare(b.ai.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">AI & Models</h2>
          <p className="text-xs text-muted">{db.ai.length} AI · {db.models.length} models</p>
        </div>
        <Link href="/admin/ai/new" className="btn btn-primary text-xs">
          + Naya AI
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
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
            {stats.map((s) => (
              <tr key={s.ai.id}>
                <td className="p-3">
                  <Link href={`/admin/ai/${s.ai.slug}`} className="flex items-center gap-2 font-medium hover:text-brand">
                    <span aria-hidden>{s.ai.logo}</span>
                    {s.ai.name}
                  </Link>
                </td>
                <td className="p-3 text-xs text-muted">{categoryName(s.ai.category)}</td>
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
                    {s.ai.sponsored ? <span className="chip bg-amber-50 text-amber-700">Sponsored</span> : null}
                    {s.ai.boost > 0 ? <span className="chip bg-slate-100 text-slate-600">+{s.ai.boost}</span> : null}
                    {!s.ai.sponsored && s.ai.boost === 0 ? <span className="text-xs text-slate-300">—</span> : null}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/ai/${s.ai.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                      Edit
                    </Link>
                    <form action={deleteAiAction}>
                      <input type="hidden" name="id" value={s.ai.id} />
                      <DeleteButton
                        label="Delete"
                        message={`${s.ai.name} aur uske saare models/ratings delete ho jayenge. Pakka?`}
                      />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
