import { buildView, publishedPosts } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const SITE = "https://giglenode.com";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** RSS 2.0 feed for the blog, so readers and aggregators can subscribe. */
export async function GET() {
  const db = readDb();
  const view = buildView(db);
  const posts = publishedPosts(db).slice(0, 30);
  const siteName = view.db.settings?.siteName ?? "GigleNode";

  const items = posts
    .map((post) => {
      const url = `${SITE}/blog/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.excerpt || post.content.slice(0, 240))}</description>`,
        `      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>`,
        `      <category>${escapeXml(post.type)}</category>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(siteName)} — AI guides and rankings</title>`,
    `    <link>${SITE}</link>`,
    `    <description>${escapeXml("Independent AI directory: real user ratings, model-level detail and honest comparisons.")}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
