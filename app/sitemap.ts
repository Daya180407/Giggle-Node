import type { MetadataRoute } from "next";
import { readDb } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const db = readDb();
  const base = "https://giglenode.com";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/category/all",
    "/blog",
    "/compare",
    "/finder",
    "/contributors",
    "/my-list",
    "/login",
    "/about",
    "/contact",
    "/privacy",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const categories: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const ais: MetadataRoute.Sitemap = db.ai.map((ai) => ({
    url: `${base}/ai/${ai.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const models: MetadataRoute.Sitemap = db.models.flatMap((m) => {
    const ai = db.ai.find((a) => a.id === m.aiId);
    return ai
      ? [
          {
            url: `${base}/ai/${ai.slug}/${m.slug}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : [];
  });

  const posts: MetadataRoute.Sitemap = db.posts
    .filter((p) => p.status === "published")
    .map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...categories, ...ais, ...models, ...posts];
}
