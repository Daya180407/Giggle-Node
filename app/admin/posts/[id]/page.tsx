import Link from "next/link";
import { notFound } from "next/navigation";
import PostForm from "@/components/admin/PostForm";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAreaPage("posts");
  const { id } = await params;
  const db = readDb();
  const post = db.posts.find((p) => p.id === id);
  if (!post) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Post Edit</h2>
        <div className="flex gap-2">
          {post.status === "published" ? (
            <Link href={`/blog/${post.slug}`} className="btn btn-ghost text-xs">
              Public page →
            </Link>
          ) : null}
          <Link href="/admin/posts" className="text-xs text-brand">
            ← Wapas
          </Link>
        </div>
      </div>
      <div className="card p-4">
        <PostForm post={post} ais={db.ai} />
      </div>
    </div>
  );
}
