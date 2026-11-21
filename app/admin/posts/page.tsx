import Link from "next/link";
import { deletePostAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { POST_TYPE_LABEL } from "@/lib/categories";
import { formatDate, readingTime } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminPostsPage() {
  const db = readDb();
  const posts = [...db.posts].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Posts</h2>
          <p className="text-xs text-muted">
            {posts.filter((p) => p.status === "published").length} published ·{" "}
            {posts.filter((p) => p.status === "draft").length} drafts
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn btn-primary text-xs">
          + Naya Post
        </Link>
      </div>

      <div className="card divide-y divide-line">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-lg">{p.coverEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted">
                {POST_TYPE_LABEL[p.type]} · {p.status === "published" ? "Published" : "Draft"} ·{" "}
                {formatDate(p.createdAt)} · {readingTime(p.content)} min · {p.relatedAiIds.length} AI
              </p>
            </div>
            {p.sponsored ? <span className="chip bg-amber-50 text-amber-700">Sponsored</span> : null}
            <Link href={`/admin/posts/${p.id}`} className="btn btn-ghost !px-2 !py-1 text-xs">
              Edit
            </Link>
            {p.status === "published" ? (
              <Link href={`/blog/${p.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                View
              </Link>
            ) : null}
            <form action={deletePostAction}>
              <input type="hidden" name="id" value={p.id} />
              <DeleteButton message={`“${p.title}” delete karna hai?`} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
