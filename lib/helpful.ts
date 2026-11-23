import type { DB } from "./types";

export type HelpfulScore = {
  useful: number;
  notUseful: number;
  total: number;
  /** Share of votes that answered "yes", 0–100. */
  percent: number;
};

/**
 * Aggregated "Was this helpful?" answers for one AI listing, or for a single
 * model inside it. This is a light community signal, so it is kept out of the
 * weighted 1–5 rating that drives the leaderboard.
 */
export function helpfulScore(db: DB, aiId: string, modelId: string | null = null): HelpfulScore {
  let useful = 0;
  let notUseful = 0;
  for (const vote of db.helpfulVotes ?? []) {
    if (vote.aiId !== aiId || vote.modelId !== modelId) continue;
    if (vote.helpful) useful += 1;
    else notUseful += 1;
  }
  const total = useful + notUseful;
  return { useful, notUseful, total, percent: total ? Math.round((useful / total) * 100) : 0 };
}

/** The answer this signed-in viewer already gave, if any. */
export function myHelpfulVote(
  db: DB,
  aiId: string,
  modelId: string | null,
  userId: string | null,
): "yes" | "no" | null {
  if (!userId) return null;
  const row = (db.helpfulVotes ?? []).find(
    (vote) => vote.voter === `user:${userId}` && vote.aiId === aiId && vote.modelId === modelId,
  );
  return row ? (row.helpful ? "yes" : "no") : null;
}

/** Site-wide number of helpful answers, for public social proof. */
export function helpfulTotal(db: DB): number {
  return (db.helpfulVotes ?? []).length;
}
