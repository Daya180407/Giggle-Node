import { NextResponse } from "next/server";
import { mutateDb, readDb, uid } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_VOTES = 20000;

/**
 * Records one blind arena pick. No account is needed: the page is a quick
 * community signal, separate from the weighted 1–5 rating that drives the
 * leaderboard. Picks are stored only as an id pair plus the winner.
 */
export async function POST(request: Request) {
  let body: { aId?: string; bId?: string; winnerId?: string };
  try {
    body = (await request.json()) as { aId?: string; bId?: string; winnerId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const aId = String(body.aId ?? "");
  const bId = String(body.bId ?? "");
  const winnerId = String(body.winnerId ?? "");

  if (!aId || !bId || aId === bId || (winnerId !== aId && winnerId !== bId)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const db = readDb();
  const categoryOf = new Map(db.ai.map((ai) => [ai.id, ai.category]));
  if (!categoryOf.has(aId) || !categoryOf.has(bId)) {
    return NextResponse.json({ ok: false, error: "unknown-ai" }, { status: 404 });
  }
  // A pick only means something between two tools doing the same job, so a
  // cross-category pair is refused here even if an old client sends one.
  if (categoryOf.get(aId) !== categoryOf.get(bId)) {
    return NextResponse.json({ ok: false, error: "cross-category" }, { status: 422 });
  }

  mutateDb((draft) => {
    if (!Array.isArray(draft.arenaVotes)) draft.arenaVotes = [];
    draft.arenaVotes.push({ id: uid("arena"), aId, bId, winnerId, at: new Date().toISOString() });
    if (draft.arenaVotes.length > MAX_VOTES) draft.arenaVotes.splice(0, draft.arenaVotes.length - MAX_VOTES);
  });

  return NextResponse.json({ ok: true });
}
