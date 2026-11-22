import { NextResponse } from "next/server";
import { getCategories } from "@/lib/categories";
import { buildView, searchAll } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Live typeahead: catalogue text match only, no model call. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 1) return NextResponse.json({ suggestions: [] }, { headers: { "cache-control": "no-store" } });

  const db = readDb();
  const categories = new Map(getCategories(db).map((c) => [c.slug, c.name]));
  const matches = searchAll(buildView(db), q).ais.slice(0, 5).map((stat) => ({
    name: stat.ai.name,
    slug: stat.ai.slug,
    logo: stat.ai.logo,
    color: stat.ai.color,
    category: categories.get(stat.ai.category) ?? stat.ai.category,
    score: Math.round(stat.score * 10) / 10,
  }));

  return NextResponse.json({ suggestions: matches }, { headers: { "cache-control": "no-store" } });
}
