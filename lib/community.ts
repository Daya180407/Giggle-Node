import type { Ai, DB, PriceSnapshot, ReviewReply } from "./types";

/**
 * Community helpers shared by the public pages and the admin inboxes:
 * verified ratings, price snapshots/alerts, review replies and newsletter stats.
 * Everything works on the single JSON document, so no extra infrastructure.
 */

const DAY = 86400000;
const MAX_VISITS = 5000;
const MAX_SNAPSHOTS = 2000;

/* ------------------------------ verified use ------------------------------ */

/** Records that a signed-in user opened this tool (at most once per day). */
export function recordAiVisit(db: DB, userId: string, aiId: string, at = new Date().toISOString()) {
  if (!Array.isArray(db.aiVisits)) db.aiVisits = [];
  const dayStart = new Date(at).setHours(0, 0, 0, 0);
  const duplicate = db.aiVisits.some(
    (visit) => visit.userId === userId && visit.aiId === aiId && new Date(visit.at).setHours(0, 0, 0, 0) === dayStart,
  );
  if (duplicate) return;
  db.aiVisits.push({ userId, aiId, at });
  db.aiVisits = db.aiVisits.slice(-MAX_VISITS);
}

/** True when the user has opened this tool from GigleNode in the last 120 days. */
export function hasVerifiedUse(db: DB, userId: string, aiId: string, now = Date.now()): boolean {
  return (db.aiVisits ?? []).some(
    (visit) => visit.userId === userId && visit.aiId === aiId && now - new Date(visit.at).getTime() < 120 * DAY,
  );
}

export type VerifiedShare = { verified: number; total: number; percent: number };

/** Share of a tool's ratings that came from users who actually opened it. */
export function verifiedShare(db: DB, aiId: string): VerifiedShare {
  const modelIds = new Set(db.models.filter((model) => model.aiId === aiId).map((model) => model.id));
  const rows = db.ratings.filter((rating) => modelIds.has(rating.modelId) && rating.status !== "rejected");
  const verified = rows.filter((rating) => rating.verified).length;
  return { verified, total: rows.length, percent: rows.length ? Math.round((verified / rows.length) * 100) : 0 };
}

/* ------------------------------- pricing ------------------------------- */

export function priceHistoryFor(db: DB, aiId: string): PriceSnapshot[] {
  return (db.priceHistory ?? []).filter((row) => row.aiId === aiId).sort((a, b) => +new Date(a.at) - +new Date(b.at));
}

/** Adds a snapshot, skipping it when the price did not change since the last one. */
export function recordPriceSnapshot(
  db: DB,
  ai: Ai,
  at = new Date().toISOString(),
): PriceSnapshot | null {
  if (!Array.isArray(db.priceHistory)) db.priceHistory = [];
  const rows = priceHistoryFor(db, ai.id);
  const last = rows[rows.length - 1];
  const price = Number(ai.planPrice) || 0;
  if (last && last.planPrice === price) return null;
  const snapshot: PriceSnapshot = {
    id: `px_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    aiId: ai.id,
    planPrice: price,
    planPriceInr: Number(ai.planPriceInr) || 0,
    at,
  };
  db.priceHistory.push(snapshot);
  db.priceHistory = db.priceHistory.slice(-MAX_SNAPSHOTS);
  return snapshot;
}

export type PriceChange = { from: number; to: number; percent: number; at: string };

/** Movement between the last two recorded prices, when both are paid prices. */
export function priceChange(db: DB, aiId: string): PriceChange | null {
  const rows = priceHistoryFor(db, aiId);
  if (rows.length < 2) return null;
  const previous = rows[rows.length - 2];
  const current = rows[rows.length - 1];
  if (previous.planPrice === current.planPrice) return null;
  const percent = previous.planPrice > 0 ? Math.round(((current.planPrice - previous.planPrice) / previous.planPrice) * 100) : 0;
  return { from: previous.planPrice, to: current.planPrice, percent, at: current.at };
}

export function alertsFor(db: DB, aiId: string) {
  return (db.priceAlerts ?? []).filter((alert) => alert.aiId === aiId);
}

export function myPriceAlert(db: DB, userId: string, aiId: string) {
  return (db.priceAlerts ?? []).find((alert) => alert.userId === userId && alert.aiId === aiId) ?? null;
}

/* ------------------------------- trend -------------------------------- */

export type TrendPoint = { label: string; avg: number; count: number; start: number };

/**
 * Weekly average star rating for a tool (all of its models), oldest first.
 * Empty weeks are skipped so the sparkline always shows real votes.
 */
export function weeklyRatingTrend(db: DB, aiId: string, weeks = 8): TrendPoint[] {
  const modelIds = new Set(db.models.filter((model) => model.aiId === aiId).map((model) => model.id));
  const ratings = db.ratings.filter(
    (rating) => modelIds.has(rating.modelId) && rating.status !== "rejected" && rating.status !== "pending",
  );
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const rows = ratings.filter((rating) => {
      const at = +new Date(rating.createdAt);
      return at >= +start && at <= +end;
    });
    if (rows.length === 0) continue;
    const avg = rows.reduce((sum, rating) => sum + rating.stars, 0) / rows.length;
    points.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg: Math.round(avg * 100) / 100,
      count: rows.length,
      start: +start,
    });
  }
  return points;
}

/* -------------------------- claims & replies -------------------------- */

export function claimFor(db: DB, aiId: string) {
  return db.ai.find((ai) => ai.id === aiId)?.claim ?? null;
}

export function repliesFor(db: DB, ratingIds: string[]): Map<string, ReviewReply[]> {
  const wanted = new Set(ratingIds);
  const map = new Map<string, ReviewReply[]>();
  for (const reply of db.reviewReplies ?? []) {
    if (!wanted.has(reply.ratingId)) continue;
    const list = map.get(reply.ratingId) ?? [];
    list.push(reply);
    map.set(reply.ratingId, list);
  }
  return map;
}

/* ----------------------------- newsletter ----------------------------- */

export function activeSubscribers(db: DB) {
  return (db.subscribers ?? []).filter((row) => row.confirmed && !row.unsubscribedAt);
}

export function subscriberStats(db: DB) {
  const rows = db.subscribers ?? [];
  return {
    total: rows.length,
    confirmed: rows.filter((row) => row.confirmed && !row.unsubscribedAt).length,
    pending: rows.filter((row) => !row.confirmed && !row.unsubscribedAt).length,
    unsubscribed: rows.filter((row) => row.unsubscribedAt).length,
  };
}

/* ------------------------------ backfill ------------------------------ */

/** Stable 0–99 bucket for a row id, so backfilled flags are identical on every boot. */
function bucket(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return hash % 100;
}

/**
 * Legacy data predates both flags, so seeded ratings get a stable verification
 * flag and every tool gets a baseline price snapshot. Runs once per document.
 */
export function backfillCommunity(db: DB): boolean {
  let changed = false;
  for (const rating of db.ratings) {
    if (typeof rating.verified !== "boolean") {
      rating.verified = bucket(rating.id) < 78;
      changed = true;
    }
  }
  if (!Array.isArray(db.priceHistory)) {
    db.priceHistory = [];
    changed = true;
  }
  const known = new Set(db.priceHistory.map((row) => row.aiId));
  for (const ai of db.ai) {
    if (known.has(ai.id)) continue;
    db.priceHistory.push({
      id: `px_${ai.id}`,
      aiId: ai.id,
      planPrice: Number(ai.planPrice) || 0,
      planPriceInr: Number(ai.planPriceInr) || 0,
      at: ai.createdAt || new Date().toISOString(),
    });
    changed = true;
  }
  return changed;
}
