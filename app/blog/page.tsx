import Link from "next/link";
import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import { POST_TYPE_LABEL } from "@/lib/categories";
import { publishedPosts } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Blog — News, Comparison, Top 10 Lists & Tutorials",
  description: "Honest AI reviews, comparisons and step-by-step tutorials — backed by real user ratings.",
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

      <span className="eyebrow">GiggleNode editorial</span>
      <h1 className="display mt-1.5 text-3xl text-ink sm:text-4xl">Guides, news &amp; comparisons</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Practical tutorials, honest comparisons and top lists. Every post is linked to the live ranking and the AI
        tools it mentions.
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
            {t === "all" ? "All" : POST_TYPE_LABEL[t]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-sm text-muted">No posts in this category yet.</p>
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
