import { deleteRatingAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Stars } from "@/components/ui";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminRatingsPage() {
  const db = readDb();
  const recent = [...db.ratings].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 80);
  const reviews = db.ratings.filter((r) => r.review && r.review.trim()).length;
  const edited = db.ratings.filter((r) => r.lastEditedAt).length;
  const last7 = db.ratings.filter((r) => Date.now() - +new Date(r.createdAt) < 7 * 86400000).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ratings Moderation</h2>
        <p className="text-xs text-muted">
          Report ya fake lagne wali rating delete kijiye. Delete karne se ranking turant recalculate hoti hai.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total ratings", value: db.ratings.length.toLocaleString("en-IN") },
          { label: "With review", value: reviews },
          { label: "Edited", value: edited },
          { label: "Last 7 din", value: last7 },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="text-xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card divide-y divide-line">
        {recent.map((r) => {
          const model = db.models.find((m) => m.id === r.modelId);
          const ai = model ? db.ai.find((a) => a.id === model.aiId) : undefined;
          const user = db.users.find((u) => u.id === r.userId);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-3">
              <Stars value={r.stars} size={12} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-semibold">{model?.name ?? "unknown model"}</span>{" "}
                  <span className="text-muted">· {ai?.name}</span>
                </p>
                <p className="truncate text-xs text-muted">
                  {user?.name ?? "unknown user"} · {user?.email} · {timeAgo(r.updatedAt)}
                  {r.lastEditedAt ? " · edited" : ""}
                </p>
                {r.review ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">“{r.review}”</p> : null}
              </div>
              <form action={deleteRatingAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="back" value="/admin/ratings" />
                <DeleteButton label="Delete" message="Ye rating delete karni hai? Ranking update ho jayegi." />
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
