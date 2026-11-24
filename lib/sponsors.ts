import type { Ai, DB, SponsorPlacement, SponsorSlotKey } from "./types";

/**
 * Sponsored slots.
 *
 * `position` is the rank after which the paid card is inserted inside a list.
 * `top3` is the extra card on a category podium, placed between #1 and #2 — it
 * carries no rank badge at all. The list slots keep the sponsored listing's real
 * rank: a tool ranked 120th shown after the 5th row still reads "#120".
 */
export type SponsorSlot = {
  key: SponsorSlotKey;
  label: string;
  short: string;
  position: number;
  blurb: string;
  defaultPrice: number;
};

export const SPONSOR_SLOTS: SponsorSlot[] = [
  {
    key: "top3",
    label: "Category top 3 — after #1",
    short: "Top 3 podium",
    position: 1,
    blurb: "The extra card inside a category's top-three podium, right after the champion. Highest visibility on the homepage.",
    defaultPrice: 15000,
  },
  {
    key: "list5",
    label: "List — after 5th",
    short: "After #5",
    position: 5,
    blurb: "Inside the full AI ranking or app list, right after the fifth row. The sponsored row keeps its real rank.",
    defaultPrice: 9000,
  },
  {
    key: "list10",
    label: "List — after 10th",
    short: "After #10",
    position: 10,
    blurb: "After the tenth row — still on the first screen of the leaderboard.",
    defaultPrice: 6500,
  },
  {
    key: "list15",
    label: "List — after 15th",
    short: "After #15",
    position: 15,
    blurb: "After the fifteenth row, for a lower-cost entry into a popular list.",
    defaultPrice: 4500,
  },
  {
    key: "list50",
    label: "List — after 50th",
    short: "After #50",
    position: 50,
    blurb: "The budget placement at the back of a long list, still labelled as sponsored.",
    defaultPrice: 2500,
  },
];

export const SPONSOR_SLOT_KEYS: SponsorSlotKey[] = SPONSOR_SLOTS.map((slot) => slot.key);

export function slotMeta(key: string): SponsorSlot | null {
  return SPONSOR_SLOTS.find((slot) => slot.key === key) ?? null;
}

export function defaultSponsorPrices(): Record<SponsorSlotKey, number> {
  return SPONSOR_SLOTS.reduce(
    (prices, slot) => ({ ...prices, [slot.key]: slot.defaultPrice }),
    {} as Record<SponsorSlotKey, number>,
  );
}

/** Admin prices merged over the defaults, so a new slot never renders as free. */
export function sponsorPrices(db: DB): Record<SponsorSlotKey, number> {
  const saved = db.sponsorPrices ?? {};
  const prices = defaultSponsorPrices();
  for (const key of SPONSOR_SLOT_KEYS) {
    const value = saved[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) prices[key] = Math.round(value);
  }
  return prices;
}

/** True when a booking's last day (YYYY-MM-DD, inclusive) is in the past. */
export function sponsorEnded(until?: string | null, now = Date.now()): boolean {
  if (!until) return false;
  const end = new Date(`${until}T23:59:59`).getTime();
  return Number.isFinite(end) ? end < now : false;
}

/** A placement is live while it is active and its booking has not expired. */
export function isPlacementLive(placement: SponsorPlacement, now = Date.now()): boolean {
  if (!placement.active) return false;
  return !sponsorEnded(placement.until, now);
}

/**
 * The per-listing "Sponsored" label. Admin books it for a number of days; once
 * that last day passes the label switches itself off without anyone editing the
 * listing again. Re-booking is just entering a new number of days.
 */
export function isAiSponsored(ai: Pick<Ai, "sponsored" | "sponsorUntil">, now = Date.now()): boolean {
  return Boolean(ai.sponsored) && !sponsorEnded(ai.sponsorUntil, now);
}

export function activeSponsorPlacements(db: DB, now = Date.now()): SponsorPlacement[] {
  return (db.sponsorPlacements ?? []).filter((placement) => isPlacementLive(placement, now));
}

export function placementsFor(
  db: DB,
  targetType: SponsorPlacement["targetType"],
  listKey: string,
  now = Date.now(),
): SponsorPlacement[] {
  return activeSponsorPlacements(db, now).filter(
    (placement) => placement.targetType === targetType && placement.listKey === listKey,
  );
}

/** The single top-three podium booking for a category, if one is live. */
export function top3PlacementFor(db: DB, categorySlug: string, now = Date.now()): SponsorPlacement | null {
  return (
    placementsFor(db, "ai", categorySlug, now).find((placement) => placement.slot === "top3") ?? null
  );
}

export function money(amount: number, currency = "INR"): string {
  const value = Math.max(0, Math.round(amount));
  return currency === "USD"
    ? `$${value.toLocaleString("en-US")}`
    : `₹${value.toLocaleString("en-IN")}`;
}

export const APP_LIST_KEYS = [
  { key: "mobile", label: "Mobile apps list" },
  { key: "desktop", label: "PC software list" },
];

export function isAppListKey(listKey: string): boolean {
  return APP_LIST_KEYS.some((row) => row.key === listKey);
}

export function appListLabel(listKey: string): string {
  return APP_LIST_KEYS.find((row) => row.key === listKey)?.label ?? "Apps & software";
}

export function aiListLabel(listKey: string, categoryName?: (slug: string) => string): string {
  if (listKey === "all") return "All AI leaderboard";
  return `${categoryName ? categoryName(listKey) : listKey} AI ranking`;
}

/** Placement target label for admin tables and the advertiser's quote. */
export function placementListLabel(
  placement: Pick<SponsorPlacement, "targetType" | "listKey">,
  categoryName?: (slug: string) => string,
): string {
  return placement.targetType === "ai"
    ? aiListLabel(placement.listKey, categoryName)
    : appListLabel(placement.listKey);
}

export type SponsorSlotRevenue = {
  slot: SponsorSlotKey;
  label: string;
  count: number;
  booked: number;
  month: number;
  pending: number;
  pendingCount: number;
};

export type SponsorRevenue = {
  /** month shown in the summary, e.g. "November 2026" */
  monthLabel: string;
  monthTotal: number;
  monthCount: number;
  bookedTotal: number;
  bookedCount: number;
  pendingTotal: number;
  pendingCount: number;
  rows: SponsorSlotRevenue[];
};

/**
 * Manual-payment ledger for the admin summary. Booked amounts come from every
 * placement (paused or expired ones were still paid for), the month column from
 * placements created this calendar month, and pending from open requests where
 * no money has arrived yet.
 */
export function sponsorRevenue(db: DB, now = new Date()): SponsorRevenue {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const placements = db.sponsorPlacements ?? [];
  const pending = (db.sponsorRequests ?? []).filter((request) => request.status === "pending");
  const amountOf = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };
  const thisMonth = (createdAt: string) => {
    const at = new Date(createdAt).getTime();
    return Number.isFinite(at) && at >= monthStart;
  };

  const rows: SponsorSlotRevenue[] = SPONSOR_SLOTS.map((slot) => {
    const slotPlacements = placements.filter((placement) => placement.slot === slot.key);
    const slotRequests = pending.filter((request) => request.slot === slot.key);
    return {
      slot: slot.key,
      label: slot.short,
      count: slotPlacements.length,
      booked: slotPlacements.reduce((sum, placement) => sum + amountOf(placement.amount), 0),
      month: slotPlacements
        .filter((placement) => thisMonth(placement.createdAt))
        .reduce((sum, placement) => sum + amountOf(placement.amount), 0),
      pending: slotRequests.reduce((sum, request) => sum + amountOf(request.price), 0),
      pendingCount: slotRequests.length,
    };
  });

  const monthPlacements = placements.filter((placement) => thisMonth(placement.createdAt));
  return {
    monthLabel: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    monthTotal: rows.reduce((sum, row) => sum + row.month, 0),
    monthCount: monthPlacements.length,
    bookedTotal: rows.reduce((sum, row) => sum + row.booked, 0),
    bookedCount: placements.length,
    pendingTotal: rows.reduce((sum, row) => sum + row.pending, 0),
    pendingCount: pending.length,
    rows,
  };
}

export type PlacedItem<T> = {
  item: T;
  /** set when this row is a paid insertion rather than a ranked row */
  sponsor: { id: string; slot: SponsorSlotKey; amount: number; until: string | null } | null;
};

/**
 * Inserts sponsored rows after the requested position without touching the
 * ranked order of the real items. Positions past the end of the list append the
 * sponsored row at the bottom.
 */
export function insertSponsors<T>(
  items: T[],
  sponsored: { position: number; item: T; placement: SponsorPlacement }[],
): PlacedItem<T>[] {
  const rows: PlacedItem<T>[] = [];
  const pending = [...sponsored].sort((a, b) => a.position - b.position);
  items.forEach((item, index) => {
    rows.push({ item, sponsor: null });
    const rank = index + 1;
    while (pending.length && pending[0].position <= rank) {
      const next = pending.shift()!;
      rows.push({
        item: next.item,
        sponsor: { id: next.placement.id, slot: next.placement.slot, amount: next.placement.amount, until: next.placement.until },
      });
    }
  });
  for (const next of pending) {
    rows.push({
      item: next.item,
      sponsor: { id: next.placement.id, slot: next.placement.slot, amount: next.placement.amount, until: next.placement.until },
    });
  }
  return rows;
}
