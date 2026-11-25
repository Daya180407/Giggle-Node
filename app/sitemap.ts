import type { MetadataRoute } from "next";
import { readDb } from "@/lib/store";
import { getCategories } from "@/lib/categories";
import { publishedPosts } from "@/lib/rank";
import { UNIVERSAL_ROOM_SLUG } from "@/lib/community-chat";
import { USE_CASES } from "@/lib/usecases";

// Rooms, posts and AI listings are edited at runtime, so the sitemap must not be
// frozen into the build output.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const db = readDb();
  const base = "https://gigglenode.com";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/category/all",
    "/ranking",
    "/arena",
    "/value",
    "/blog",
    "/compare",
    "/prompts",
    "/community",
    "/finder",
    "/stack",
    "/submit",
    "/sponsor",
    "/contributors",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const useCases: MetadataRoute.Sitemap = USE_CASES.map((useCase) => ({
    url: `${base}/ranking/${useCase.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const categories: MetadataRoute.Sitemap = getCategories(db).map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const ais: MetadataRoute.Sitemap = db.ai.filter((ai) => !ai.hidden).map((ai) => ({
    url: `${base}/ai/${ai.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const visibleAiIds = new Set(db.ai.filter((ai) => !ai.hidden).map((ai) => ai.id));
  const communitySlugs = [
    UNIVERSAL_ROOM_SLUG,
    ...db.ai.filter((ai) => !ai.hidden).map((ai) => ai.slug),
    ...(db.communityRooms ?? [])
      .filter((room) => !room.hidden && visibleAiIds.has(room.aiId))
      .map((room) => room.slug),
  ];
  const community: MetadataRoute.Sitemap = communitySlugs.map((slug) => ({
    url: `${base}/community/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const models: MetadataRoute.Sitemap = db.models.flatMap((m) => {
    const ai = db.ai.find((a) => a.id === m.aiId);
    return ai && !ai.hidden
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

  const posts: MetadataRoute.Sitemap = publishedPosts(db).map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...useCases, ...categories, ...ais, ...community, ...models, ...posts];
}
