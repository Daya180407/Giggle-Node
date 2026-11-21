import Link from "next/link";
import PostForm from "@/components/admin/PostForm";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  const db = readDb();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Naya Post</h2>
        <Link href="/admin/posts" className="text-xs text-brand">
          ← Wapas
        </Link>
      </div>
      <div className="card p-4">
        <PostForm ais={db.ai} />
      </div>
    </div>
  );
}
