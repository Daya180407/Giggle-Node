import type { Contribution, ContributionType, DB } from "./types";

/**
 * Shared helpers for user-contributed catalogue additions. Every row is private
 * until an admin approves it, so public pages only ever read approved data from
 * the real catalogue (plans, models, pricing, AI and app lists).
 */

export const CONTRIBUTION_LABEL: Record<ContributionType, string> = {
  plan: "Subscription plan",
  model: "AI model",
  pricing: "AI pricing",
  ai: "New AI",
  app: "App / PC software",
};

export const CONTRIBUTION_TYPES: ContributionType[] = ["plan", "model", "pricing", "ai", "app"];

export function contributionType(value: string): ContributionType | null {
  return (CONTRIBUTION_TYPES as string[]).includes(value) ? (value as ContributionType) : null;
}

/** Rows still waiting for a decision, optionally for one AI only. */
export function pendingContributions(db: DB, aiId?: string): Contribution[] {
  return (db.contributions ?? []).filter(
    (row) => row.status === "pending" && (!aiId || row.aiId === aiId),
  );
}

/** Decided rows, newest first, for the "reviewed" strip in the admin inbox. */
export function reviewedContributions(db: DB, limit = 8): Contribution[] {
  return (db.contributions ?? [])
    .filter((row) => row.status !== "pending")
    .sort((a, b) => +new Date(b.reviewedAt ?? b.createdAt) - +new Date(a.reviewedAt ?? a.createdAt))
    .slice(0, limit);
}

/** A contributor's own requests — the only pending rows a non-admin may see. */
export function myContributions(db: DB, userId: string, aiId?: string): Contribution[] {
  return (db.contributions ?? []).filter(
    (row) => row.userId === userId && (!aiId || row.aiId === aiId),
  );
}

export function contributionCounts(db: DB) {
  const rows = db.contributions ?? [];
  return {
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  };
}
