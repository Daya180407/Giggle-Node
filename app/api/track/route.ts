import { NextResponse } from "next/server";
import { classifyReferrer, recordTraffic } from "@/lib/analytics";
import { mutateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Session-scoped beacon: referrer channel + blog post views for the analytics page. */
export async function POST(request: Request) {
  let body: { path?: string; referrer?: string };
  try {
    body = (await request.json()) as { path?: string; referrer?: string };
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = (body.path ?? "").slice(0, 180);
  const referrer = (body.referrer ?? "").slice(0, 500);
  const source = classifyReferrer(referrer, request.headers.get("origin") ?? undefined);

  mutateDb((db) => {
    recordTraffic(db, source);
    const match = path.match(/^\/blog\/([a-z0-9-]+)/i);
    if (match) {
      const post = db.posts.find((row) => row.slug === match[1]);
      if (post) post.views = (post.views ?? 0) + 1;
    }
  });

  return new NextResponse(null, { status: 204 });
}
