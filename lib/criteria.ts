import type { Rating, RatingCriteria, RatingCriterion } from "./types";

/** The five areas a reviewer scores. The overall stars are their plain average. */
export const RATING_CRITERIA: { key: RatingCriterion; label: string; hint: string }[] = [
  { key: "ease", label: "Easy to use", hint: "How quickly you got useful results" },
  { key: "quality", label: "Output quality", hint: "Accuracy and usefulness of the answers" },
  { key: "speed", label: "Response speed", hint: "How fast it replies" },
  { key: "reliability", label: "Reliability", hint: "Consistency, fewer errors and limits" },
  { key: "value", label: "Value for money", hint: "What you get for the price you pay" },
];

/**
 * Reads five 1–5 scores from form values or stored rows. Returns null unless
 * every area is a whole number in range, so a partial set can never be saved.
 */
export function readCriteria(value: unknown): RatingCriteria | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const out = {} as RatingCriteria;
  for (const { key } of RATING_CRITERIA) {
    const score = Number(row[key]);
    if (!Number.isInteger(score) || score < 1 || score > 5) return null;
    out[key] = score;
  }
  return out;
}

/** Overall stars: the average of the five areas, rounded to one decimal. */
export function criteriaOverall(criteria: RatingCriteria): number {
  const total = RATING_CRITERIA.reduce((sum, { key }) => sum + criteria[key], 0);
  return Math.round((total / RATING_CRITERIA.length) * 10) / 10;
}

export type CriterionRow = { key: RatingCriterion; label: string; avg: number; count: number };

/** Average score per area across real, public ratings that carry criteria. */
export function criterionAverages(ratings: Rating[]): CriterionRow[] {
  const sums = RATING_CRITERIA.map(({ key, label }) => ({ key, label, sum: 0, count: 0 }));
  for (const rating of ratings) {
    const criteria = readCriteria(rating.criteria);
    if (!criteria) continue;
    for (const row of sums) {
      row.sum += criteria[row.key];
      row.count += 1;
    }
  }
  return sums
    .filter((row) => row.count > 0)
    .map((row) => ({ key: row.key, label: row.label, avg: row.sum / row.count, count: row.count }));
}
