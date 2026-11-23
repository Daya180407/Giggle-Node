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
  const known = new Set(db.ai.map((ai) => ai.id));
  if (!known.has(aId) || !known.has(bId)) {
    return NextResponse.json({ ok: false, error: "unknown-ai" }, { status: 404 });
  }

  mutateDb((draft) => {
    if (!Array.isArray(draft.arenaVotes)) draft.arenaVotes = [];
    draft.arenaVotes.push({ id: uid("arena"), aId, bId, winnerId, at: new Date().toISOString() });
    if (draft.arenaVotes.length > MAX_VOTES) draft.arenaVotes.splice(0, draft.arenaVotes.length - MAX_VOTES);
  });

  return NextResponse.json({ ok: true });
}
