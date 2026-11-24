import { NextResponse } from "next/server";
import { isChatAdLive } from "@/lib/ads";
import { isPlacementLive } from "@/lib/sponsors";
import { mutateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Impression beacon for sponsored chat cards and list placements.
 *
 * Chat cards are sold by views, so the counter stops at the bought budget and
 * the card disappears on the next render. List placements are sold by days and
 * keep counting views for their insights report.
 */
export async function POST(request: Request) {
  let body: { kind?: string; id?: string };
  try {
    body = (await request.json()) as { kind?: string; id?: string };
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const kind = body.kind === "chat" || body.kind === "placement" ? body.kind : "";
  const id = String(body.id ?? "").slice(0, 120);
  if (!kind || !id) return new NextResponse(null, { status: 204 });

  mutateDb((db) => {
    if (kind === "chat") {
      const ad = (db.chatAds ?? []).find((row) => row.id === id);
      if (!ad || !isChatAdLive(ad)) return;
      ad.viewsServed = Math.min(ad.viewsPurchased, ad.viewsServed + 1);
      return;
    }
    const placement = (db.sponsorPlacements ?? []).find((row) => row.id === id);
    if (!placement || !isPlacementLive(placement)) return;
    placement.views = (placement.views ?? 0) + 1;
  });

  return new NextResponse(null, { status: 204 });
}
