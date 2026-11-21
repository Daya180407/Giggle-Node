import Link from "next/link";
import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import { POST_TYPE_LABEL } from "@/lib/categories";
import { publishedPosts } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Blog — News, Comparison, Top 10 Lists & Tutorials",
  description: "AI tools ke honest reviews, comparisons aur step-by-step tutorials — Hindi me, real rating ke saath.",
  alternates: { canonical: "/blog" },
};

const TYPES = ["all", "news", "comparison", "top10", "tutorial"];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type = "all" } = await searchParams;
  const db = readDb();
  const all = publishedPosts(db);
  const posts = type === "all" ? all : all.filter((p) => p.type === type);
  const [featured, ...rest] = posts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">Blog</span>
      </nav>

      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">GigleNode Blog</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        News, comparison, top 10 lists aur tutorials — sab practical, Hindi me. Har post me live ranking aur related AI
        cards automatically jude hote hain.
      </p>

      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "/blog" : `/blog?type=${t}`}
            className={`chip shrink-0 !px-3 !py-1.5 ${
              type === t ? "bg-brand text-white" : "border border-line bg-white text-slate-600 hover:text-brand"
            }`}
          >
            {t === "all" ? "Saare" : POST_TYPE_LABEL[t]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-sm text-muted">Is category me abhi koi post nahi hai.</p>
      ) : (
        <>
          <div className="mt-5">{featured ? <PostCard post={featured} featured /> : null}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
