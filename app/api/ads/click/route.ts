import { NextResponse } from "next/server";
import { chatAdDestination, isChatAdLive, placementDestination } from "@/lib/ads";
import { isPlacementLive } from "@/lib/sponsors";
import { mutateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Tracked outbound click. The destination always comes from the stored campaign
 * or placement, never from the query string, so this cannot be used as an open
 * redirect. Chat cards only count while live; an exhausted campaign still sends
 * the visitor to its page but adds no click to a finished report.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("k");
  const id = (params.get("id") ?? "").slice(0, 120);
  let destination = "/community";
  let counted = false;

  mutateDb((db) => {
    if (kind === "chat") {
      const ad = (db.chatAds ?? []).find((row) => row.id === id);
      if (!ad) return;
      destination = chatAdDestination(db, ad);
      if (isChatAdLive(ad)) {
        ad.clicks += 1;
        counted = true;
      }
      return;
    }
    if (kind === "placement") {
      const placement = (db.sponsorPlacements ?? []).find((row) => row.id === id);
      if (!placement) return;
      destination = placementDestination(db, placement);
      if (isPlacementLive(placement)) {
        placement.clicks = (placement.clicks ?? 0) + 1;
        counted = true;
      }
    }
  });
  void counted;

  return NextResponse.redirect(new URL(destination, request.url));
}
