import Link from "next/link";
import { redirect } from "next/navigation";
import { saveOwnerPostAction } from "@/app/owner-actions";
import { getCurrentOwner } from "@/lib/owner-auth";
import { MAX_OWNER_DRAFTS, aiIdsForOwner, ownerDrafts } from "@/lib/owners";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OwnerNewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");

  const db = await refreshDb();
  if (ownerDrafts(db, owner.id).length >= MAX_OWNER_DRAFTS) redirect("/owner/posts?error=drafts");

  const { error } = await searchParams;
  const aiIds = aiIdsForOwner(db, owner.id);
  const ais = db.ai.filter((ai) => aiIds.includes(ai.id));

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="display text-xl text-ink">New draft</h2>
        <Link href="/owner/posts" className="btn btn-ghost !py-1.5 text-xs">
          ← Posts
        </Link>
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error === "content" ? "Write at least a few sentences (40+ characters)." : "Add a title of at least 4 characters."}
        </p>
      ) : null}
      <form action={saveOwnerPostAction} className="card space-y-3 p-5">
        <label className="block text-xs font-semibold text-slate-600">
          Title
          <input name="title" required maxLength={120} className="field mt-1 w-full" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Listing
            <select name="relatedAiIds" className="field mt-1 w-full" defaultValue={ais[0]?.id ?? ""}>
              {ais.map((ai) => (
                <option key={ai.id} value={ai.id}>
                  {ai.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Cover emoji
            <input name="coverEmoji" maxLength={4} defaultValue="📰" className="field mt-1 w-full" />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Summary
          <input name="excerpt" maxLength={300} className="field mt-1 w-full" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Body (plain text)
          <textarea name="content" rows={12} maxLength={20000} className="field mt-1 w-full" />
        </label>
        <button className="btn btn-primary">Save draft</button>
      </form>
    </div>
  );
}
