import Link from "next/link";
import { deletePostAction, duplicatePostAction, setPostStatusAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { POST_TYPE_LABEL } from "@/lib/categories";
import { formatDate, readingTime } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 30;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "all", page = "1" } = await searchParams;
  const db = readDb();
  const query = q.trim().toLowerCase();

  const filtered = db.posts.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (!query) return true;
    return [p.title, p.slug, p.author, p.excerpt, p.content].join(" ").toLowerCase().includes(query);
  });
  filtered.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const posts = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const params = (nextPage: number) =>
    `/admin/posts?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status !== "all" ? { status } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Content</p>
          <h2 className="display mt-1 text-2xl text-ink">Posts & guides</h2>
          <p className="mt-1 text-xs text-muted">
            {db.posts.filter((p) => p.status === "published").length} published ·{" "}
            {db.posts.filter((p) => p.status === "draft").length} drafts ·{" "}
            {db.posts.filter((p) => p.sponsored).length} sponsored
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn btn-primary text-xs">
          + New post
        </Link>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/posts">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, slug, author or content…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search posts"
        />
        <select name="status" defaultValue={status} className="field !w-auto !py-2 text-xs" aria-label="Filter status">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q || status !== "all" ? (
          <Link href="/admin/posts" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-cyan-50 text-lg">
              {p.coverEmoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.title}</p>
              <p className="truncate text-[11px] text-muted">
                {POST_TYPE_LABEL[p.type]} · {p.status === "published" ? "Published" : "Draft"} ·{" "}
                {formatDate(p.createdAt)} · {readingTime(p.content)} min · {p.relatedAiIds.length} AI · {p.author}
              </p>
            </div>
            {p.sponsored ? <span className="chip bg-amber-50 text-amber-700">Sponsored</span> : null}
            <div className="flex flex-wrap items-center gap-1">
              <Link href={`/admin/posts/${p.id}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                Edit
              </Link>
              {p.status === "published" ? (
                <Link href={`/blog/${p.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                  View
                </Link>
              ) : null}
              <form action={setPostStatusAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="status" value={p.status === "published" ? "draft" : "published"} />
                <button className="btn btn-ghost !px-2 !py-1 text-xs">
                  {p.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </form>
              <form action={duplicatePostAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn btn-ghost !px-2 !py-1 text-xs">Duplicate</button>
              </form>
              <form action={deletePostAction}>
                <input type="hidden" name="id" value={p.id} />
                <DeleteButton message={`“${p.title}” delete karna hai?`} />
              </form>
            </div>
          </div>
        ))}
        {posts.length === 0 ? <p className="p-8 text-center text-sm text-muted">No posts match these filters.</p> : null}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          {pageNo > 1 ? (
            <Link href={params(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Page {pageNo} of {pages}
          </span>
          {pageNo < pages ? (
            <Link href={params(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
