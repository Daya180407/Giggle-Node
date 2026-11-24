import { allApps } from "./software";
import type { Ai, ChatAd, DB, SponsorPlacement } from "./types";

/**
 * Sponsored chat cards.
 *
 * A chat campaign is sold per thousand impressions (CPM) with a fixed number of
 * bought views — 10,000 views at a ₹200 CPM costs ₹2,000. Once that many views
 * have actually been served the card switches itself off, even if the admin
 * never touches it again. An optional day cap (`until`) can end a campaign
 * earlier, and the admin can pause one at any time.
 *
 * The same counters (views + clicks) are kept on list placements, so the
 * advertiser report looks the same for both products: chat cards are bought by
 * views, list rows by days.
 */

export const DEFAULT_CHAT_CPM = 200;
export const CHAT_AD_MIN_VIEWS = 100;
export const CHAT_AD_MAX_VIEWS = 5_000_000;

/** Admin-set default price per 1000 chat impressions. */
export function chatAdCpm(db: DB): number {
  const saved = Number(db.chatAdCpm);
  return Number.isFinite(saved) && saved >= 0 ? Math.round(saved) : DEFAULT_CHAT_CPM;
}

/** What a campaign costs for the bought views, rounded up to the whole rupee. */
export function chatAdPrice(cpm: number, views: number): number {
  const safeCpm = Number.isFinite(cpm) && cpm > 0 ? cpm : 0;
  const safeViews = Number.isFinite(views) && views > 0 ? views : 0;
  return Math.ceil((safeViews / 1000) * safeCpm);
}

/** Value of the impressions already delivered, at the campaign CPM. */
export function chatAdDeliveredValue(ad: Pick<ChatAd, "cpm" | "viewsServed">): number {
  return Math.ceil((Math.max(0, ad.viewsServed) / 1000) * Math.max(0, ad.cpm));
}

/** Value of the whole booking, at the campaign CPM. */
export function chatAdBookedValue(ad: Pick<ChatAd, "cpm" | "viewsPurchased">): number {
  return chatAdPrice(ad.cpm, Math.max(0, ad.viewsPurchased));
}

/** True when the optional calendar cap is in the past (last day inclusive). */
export function chatAdEnded(until: string | null | undefined, now = Date.now()): boolean {
  if (!until) return false;
  const end = new Date(`${until}T23:59:59`).getTime();
  return Number.isFinite(end) ? end < now : false;
}

/** A campaign serves while it is active, under its view budget and inside its dates. */
export function isChatAdLive(ad: ChatAd, now = Date.now()): boolean {
  if (!ad.active) return false;
  if (ad.viewsServed >= ad.viewsPurchased) return false;
  return !chatAdEnded(ad.until, now);
}

export type ChatAdStatus = "Running" | "Paused" | "Finished" | "Expired";

export function chatAdStatus(ad: ChatAd, now = Date.now()): ChatAdStatus {
  if (ad.viewsServed >= ad.viewsPurchased) return "Finished";
  if (chatAdEnded(ad.until, now)) return "Expired";
  return ad.active ? "Running" : "Paused";
}

export function liveChatAds(db: DB, now = Date.now()): ChatAd[] {
  return (db.chatAds ?? []).filter((ad) => isChatAdLive(ad, now));
}

/** Views still left in the bought budget. */
export function chatAdViewsLeft(ad: Pick<ChatAd, "viewsServed" | "viewsPurchased">): number {
  return Math.max(0, ad.viewsPurchased - ad.viewsServed);
}

/** 0–100 delivered percentage for the progress bar. */
export function chatAdProgress(ad: Pick<ChatAd, "viewsServed" | "viewsPurchased">): number {
  if (ad.viewsPurchased <= 0) return 100;
  return Math.min(100, Math.round((ad.viewsServed / ad.viewsPurchased) * 100));
}

export function adCtr(views: number, clicks: number): number {
  return views > 0 ? (clicks / views) * 100 : 0;
}

/**
 * Picks the campaign for one chat slot. Sorting by delivered share first spreads
 * a small budget and a large budget evenly, so one big booking cannot starve
 * another live campaign.
 */
export function chatAdForSlot(ads: ChatAd[], slotIndex: number): ChatAd | null {
  if (ads.length === 0) return null;
  const ordered = [...ads].sort((a, b) => {
    const shareA = a.viewsPurchased > 0 ? a.viewsServed / a.viewsPurchased : 1;
    const shareB = b.viewsPurchased > 0 ? b.viewsServed / b.viewsPurchased : 1;
    return shareA - shareB || +new Date(a.createdAt) - +new Date(b.createdAt);
  });
  return ordered[Math.abs(slotIndex) % ordered.length] ?? null;
}

/** Logo, colour and name for the promoted listing, read fresh from the catalogue. */
export function chatAdCreative(
  db: DB,
  ad: Pick<ChatAd, "targetType" | "targetId" | "targetName" | "targetSlug">,
): { name: string; logo: string; color: string; slug: string } {
  if (ad.targetType === "ai") {
    const ai: Ai | undefined = db.ai.find((row) => row.id === ad.targetId);
    return {
      name: ai?.name ?? ad.targetName,
      logo: ai?.logo ?? "🤖",
      color: ai?.color ?? "#4F46E5",
      slug: ai?.slug ?? ad.targetSlug,
    };
  }
  const app = allApps(db.customApps).find((row) => row.slug === ad.targetId);
  return {
    name: app?.name ?? ad.targetName,
    logo: app?.emoji ?? "📱",
    color: app?.color ?? "#0891b2",
    slug: app?.slug ?? ad.targetSlug,
  };
}

/** CTA destination, preferring the campaign URL and falling back to the listing. */
export function chatAdDestination(db: DB, ad: Pick<ChatAd, "url" | "targetType" | "targetId" | "targetSlug">): string {
  if (/^https?:\/\//i.test(ad.url)) return ad.url;
  if (ad.targetType === "ai") {
    const ai = db.ai.find((row) => row.id === ad.targetId);
    return ai?.website || `/ai/${ai?.slug ?? ad.targetSlug}`;
  }
  const app = allApps(db.customApps).find((row) => row.slug === ad.targetId);
  return app?.affiliateUrl || app?.website || "/#apps";
}

/** Where a sponsored list row sends a click: the tracked /go redirect or the app site. */
export function placementDestination(
  db: DB,
  placement: Pick<SponsorPlacement, "targetType" | "targetId" | "targetSlug">,
): string {
  if (placement.targetType === "ai") return `/go/${placement.targetSlug}`;
  const app = allApps(db.customApps).find((row) => row.slug === placement.targetId);
  return app?.affiliateUrl || app?.website || "/#apps";
}

export function placementCtr(placement: Pick<SponsorPlacement, "views" | "clicks">): number {
  return adCtr(placement.views ?? 0, placement.clicks ?? 0);
}

export function chatAdReportPath(token: string): string {
  return `/sponsor/report/${token}`;
}

export function placementReportPath(placement: Pick<SponsorPlacement, "id" | "reportToken">): string {
  return `/sponsor/report/${placement.reportToken ?? placement.id}`;
}

export type ChatAdsSummary = {
  live: number;
  total: number;
  viewsServed: number;
  clicks: number;
  ctr: number;
  bookedValue: number;
  deliveredValue: number;
  viewsPurchased: number;
};

/** Headline numbers for the admin ads dashboard. */
export function chatAdsSummary(db: DB, now = Date.now()): ChatAdsSummary {
  const ads = db.chatAds ?? [];
  const viewsServed = ads.reduce((sum, ad) => sum + Math.max(0, ad.viewsServed), 0);
  const clicks = ads.reduce((sum, ad) => sum + Math.max(0, ad.clicks), 0);
  return {
    live: ads.filter((ad) => isChatAdLive(ad, now)).length,
    total: ads.length,
    viewsServed,
    clicks,
    ctr: adCtr(viewsServed, clicks),
    bookedValue: ads.reduce((sum, ad) => sum + chatAdBookedValue(ad), 0),
    deliveredValue: ads.reduce((sum, ad) => sum + chatAdDeliveredValue(ad), 0),
    viewsPurchased: ads.reduce((sum, ad) => sum + Math.max(0, ad.viewsPurchased), 0),
  };
}

export type PlacementInsight = {
  id: string;
  name: string;
  label: string;
  views: number;
  clicks: number;
  ctr: number;
  live: boolean;
  reportHref: string;
};

/** List-placement insights: same report for day-priced ads. */
export function placementInsights(db: DB, labelFor: (placement: SponsorPlacement) => string): PlacementInsight[] {
  return [...(db.sponsorPlacements ?? [])]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .map((placement) => ({
      id: placement.id,
      name: placement.targetName,
      label: labelFor(placement),
      views: placement.views ?? 0,
      clicks: placement.clicks ?? 0,
      ctr: placementCtr(placement),
      live: Boolean(placement.active),
      reportHref: placementReportPath(placement),
    }));
}
