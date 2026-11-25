import Link from "next/link";
import { POST_TYPE_LABEL } from "@/lib/categories";
import { formatDate, readingTime } from "@/lib/rank";
import type { Post } from "@/lib/types";

export default function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article className={`card card-hover group flex h-full flex-col overflow-hidden ${featured ? "sm:flex-row" : ""}`}>
      <Link
        href={`/blog/${post.slug}`}
        className={`relative grid place-items-center overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 text-5xl ${
          featured ? "sm:w-2/5 min-h-40" : "h-32"
        }`}
        aria-hidden
        tabIndex={-1}
      >
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="drop-shadow-sm">{post.coverEmoji || "📰"}</span>
        )}
        <span className="absolute left-2 top-2 chip bg-white/90 text-slate-700">
          {POST_TYPE_LABEL[post.type] ?? "Post"}
        </span>
        {post.sponsored ? (
          <span className="absolute right-2 top-2 chip bg-black/50 text-white">Sponsored</span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/blog/${post.slug}`} className="font-bold leading-snug hover:text-brand">
          {post.title}
        </Link>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{post.excerpt}</p>
        <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted">
          <span>{formatDate(post.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>{readingTime(post.content)} min read</span>
          {featured ? (
            <>
              <span aria-hidden>·</span>
              <span>{post.author}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
