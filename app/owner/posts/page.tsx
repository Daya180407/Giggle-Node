import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteOwnerPostAction } from "@/app/owner-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { getCurrentOwner } from "@/lib/owner-auth";
import { MAX_OWNER_DRAFTS, ownerDrafts } from "@/lib/owners";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  created: "Draft saved. The site team can publish it after review.",
  updated: "Draft updated.",
  deleted: "Draft deleted.",
};

const ERRORS: Record<string, string> = {
  drafts: `You already have ${MAX_OWNER_DRAFTS} open drafts. Delete one or wait for the team to publish one.`,
  post: "That draft could not be found.",
  ai: "Link one of your listings to the post first.",
};

export default async function OwnerPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");

  const { saved, error } = await searchParams;
  const db = await refreshDb();
  const drafts = ownerDrafts(db, owner.id);
  const published = db.posts
    .filter((post) => post.ownerId === owner.id && post.status !== "draft")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="display text-xl text-ink">Posts</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Owner posts are plain text (no HTML/CSS) and always start as a draft. An editor reviews and publishes them
              from the admin panel.
            </p>
          </div>
          {drafts.length < MAX_OWNER_DRAFTS ? (
            <Link href="/owner/posts/new" className="btn btn-primary !py-1.5 text-xs">
              New draft
            </Link>
          ) : (
            <span className="text-[11px] text-muted">Draft limit reached ({MAX_OWNER_DRAFTS})</span>
          )}
        </div>
        {saved && NOTICES[saved] ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {NOTICES[saved]}
          </p>
        ) : null}
        {error && ERRORS[error] ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {ERRORS[error]}
          </p>
        ) : null}
      </section>

      <section className="card divide-y divide-line">
        {drafts.map((post) => (
          <div key={post.id} className="flex flex-wrap items-center gap-2 p-3 text-xs">
            <span className="chip bg-amber-50 text-amber-700">draft</span>
            <Link href={`/owner/posts/${post.id}`} className="font-semibold text-ink hover:text-brand">
              {post.title}
            </Link>
            <span className="text-muted">{new Date(post.updatedAt).toLocaleDateString("en-IN")}</span>
            <span className="ml-auto flex items-center gap-2">
              <Link href={`/owner/posts/${post.id}`} className="btn btn-ghost !px-2 !py-1 text-[11px]">
                Edit
              </Link>
              <form action={deleteOwnerPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <DeleteButton label="Delete" message={`Delete the draft "${post.title}"?`} />
              </form>
            </span>
          </div>
        ))}
        {drafts.length === 0 ? <p className="p-4 text-xs text-muted">No drafts yet.</p> : null}
      </section>

      {published.length ? (
        <section className="card divide-y divide-line">
          {published.map((post) => (
            <div key={post.id} className="flex flex-wrap items-center gap-2 p-3 text-xs">
              <span className="chip bg-emerald-50 text-emerald-700">{post.status}</span>
              <span className="font-medium text-ink">{post.title}</span>
              <span className="ml-auto text-muted">{new Date(post.updatedAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
