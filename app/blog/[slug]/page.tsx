import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AiCard from "@/components/AiCard";
import PostBody from "@/components/PostBody";
import ShareButton from "@/components/ShareButton";
import { AiLogo, PriceBadge, Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { POST_TYPE_LABEL, categoryName } from "@/lib/categories";
import { buildView, formatDate, publishedPosts, rankedAis, readingTime } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = readDb();
  const post = db.posts.find((p) => p.slug === slug && p.status === "published");
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.createdAt,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const post = db.posts.find((p) => p.slug === slug && p.status === "published");
  if (!post) notFound();

  const view = buildView(db);
  const all = publishedPosts(db);
  const index = all.findIndex((p) => p.id === post.id);
  const nextPost = index >= 0 ? all[(index + 1) % all.length] : undefined;

  const related = post.relatedAiIds
    .map((id) => view.aiStats.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const saved = new Set(user ? db.bookmarks.filter((b) => b.userId === user.id).map((b) => b.aiId) : []);

  const category = related[0]?.ai.category;
  const topFive = category ? rankedAis(view, category).slice(0, 5) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "GigleNode",
      logo: { "@type": "ImageObject", url: "https://giglenode.com/brand/logo.png" },
    },
    image: "https://giglenode.com/og.png",
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://giglenode.com/blog/${post.slug}` },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/blog" className="hover:text-brand">
          Blog
        </Link>
        <span className="mx-1.5">/</span>
        <span className="truncate text-slate-600">{post.title}</span>
      </nav>

      <article className="mt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link href={`/blog?type=${post.type}`} className="chip bg-brand-soft text-brand">
            {POST_TYPE_LABEL[post.type]}
          </Link>
          {post.sponsored ? <span className="chip bg-slate-100 text-slate-500">Sponsored</span> : null}
          <span className="text-muted">{formatDate(post.createdAt)}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{readingTime(post.content)} min read</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{post.author}</span>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-base text-slate-600">{post.excerpt}</p>

        <div className="mt-4 grid h-40 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 text-6xl sm:h-56">
          <span aria-hidden>{post.coverEmoji || "📰"}</span>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-muted">GigleNode Editorial</span>
          <ShareButton title={post.title} />
        </div>

        <div className="mt-4">
          <PostBody content={post.content} />
        </div>
      </article>

      {post.type === "top10" && topFive.length ? (
        <section className="card mt-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="display text-lg text-ink">Live top 5 — {category ? categoryName(category) : "AI"}</h2>
              <p className="text-xs text-muted">
                This ranking keeps updating after publication, straight from real user votes.
              </p>
            </div>
            <Link href={`/category/${category}`} className="text-xs font-semibold text-brand">
              Full list →
            </Link>
          </div>
          <ol className="mt-3 divide-y divide-line">
            {topFive.map((s, i) => (
              <li key={s.ai.id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                  {i + 1}
                </span>
                <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={34} rounded="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/ai/${s.ai.slug}`} className="truncate text-sm font-semibold hover:text-brand">
                    {s.ai.name}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <Stars value={s.score} size={11} />
                    <span className="text-xs text-muted">{s.score.toFixed(1)} ({s.votes})</span>
                  </div>
                </div>
                <PriceBadge price={s.ai.priceType} />
                <a
                  href={s.ai.website}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="btn btn-ghost !px-2 !py-1 text-xs"
                >
                  Visit
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-8">
          <h2 className="display mb-3 text-xl text-ink">AI tools mentioned in this post</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.slice(0, 4).map((s) => (
              <AiCard key={s.ai.id} stat={s} saved={saved.has(s.ai.id)} back={`/blog/${post.slug}`} />
            ))}
          </div>
        </section>
      ) : null}

      {nextPost ? (
        <section className="mt-8">
          <Link href={`/blog/${nextPost.slug}`} className="card card-hover flex items-center gap-4 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-2xl">
              {nextPost.coverEmoji}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted">Next post</p>
              <p className="truncate font-semibold">{nextPost.title}</p>
            </div>
            <span className="ml-auto text-brand">→</span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
