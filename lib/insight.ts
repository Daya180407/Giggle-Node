import { PRIOR_VOTES, type AiStat, type View } from "./rank";
import { formatVotes } from "./format";

/* --------------------------- score transparency --------------------------- */

export type ScoreLayer = {
  key: "models" | "overall" | "prior";
  label: string;
  value: number;
  votes: number;
  weight: number;
  detail: string;
};

export type ScoreBreakdown = {
  final: number;
  modelLayer: number;
  overallLayer: number | null;
  priorLayer: number;
  confidence: "low" | "medium" | "high";
  layers: ScoreLayer[];
  formula: string;
};

/**
 * The public ranking formula, shown instead of hidden: each model vote, each
 * overall vote and the small prior that keeps a two-vote tool off #1.
 */
export function scoreBreakdown(stat: AiStat, view: View): ScoreBreakdown {
  const modelLayer = stat.modelScore;
  const priorLayer = view.globalAvg;
  const overallLayer = stat.aiVotes > 0 ? stat.aiAvg : null;

  const layers: ScoreLayer[] = [
    {
      key: "models",
      label: "Model ratings",
      value: modelLayer,
      votes: stat.modelVotes,
      weight: stat.modelVotes,
      detail: `${formatVotes(stat.modelVotes)} model ${stat.modelVotes === 1 ? "vote" : "votes"}`,
    },
    {
      key: "prior",
      label: "Directory prior",
      value: priorLayer,
      votes: PRIOR_VOTES,
      weight: PRIOR_VOTES,
      detail: `${PRIOR_VOTES} votes of damping, so tiny samples cannot win`,
    },
  ];
  if (overallLayer !== null) {
    layers.push({
      key: "overall",
      label: "Overall ratings",
      value: overallLayer,
      votes: stat.aiVotes,
      weight: stat.aiVotes * 2,
      detail: `${formatVotes(stat.aiVotes)} whole-product ${stat.aiVotes === 1 ? "vote" : "votes"} · 2× weight`,
    });
  }

  return {
    final: stat.score,
    modelLayer,
    overallLayer,
    priorLayer,
    confidence: stat.votes >= 1000 ? "high" : stat.votes >= 100 ? "medium" : "low",
    layers,
    formula:
      "score = (model votes × model average + 50 × directory average) ÷ (model votes + 50), then blended with overall votes at 2× weight. Recent ratings weigh up to 1.5×.",
  };
}

/* ------------------------------- momentum -------------------------------- */

export type Mover = {
  stat: AiStat;
  votes7: number;
  /** difference between the recent average and the all-time average */
  drift: number;
  direction: "up" | "down" | "flat";
};

/**
 * Momentum from real ratings only: votes collected in the last seven days and
 * how far the recent average has drifted from the model's own average. Demo
 * totals do not create fake movement because they never enter `last7`.
 */
export function movers(view: View, limit = 6): Mover[] {
  const rows: Mover[] = [...view.aiStats.values()]
    .filter((stat) => !stat.ai.hidden)
    .map((stat) => {
      const recent = stat.models.filter((m) => m.recentVotes > 0);
      const recentVotes = recent.reduce((sum, m) => sum + m.recentVotes, 0);
      const recentAvg = recentVotes
        ? recent.reduce((sum, m) => sum + m.recentAvg * m.recentVotes, 0) / recentVotes
        : stat.avg;
      const drift = recentVotes ? recentAvg - stat.avg : 0;
      return {
        stat,
        votes7: stat.last7,
        drift,
        direction: drift > 0.06 ? "up" : drift < -0.06 ? "down" : "flat",
      } as Mover;
    });

  const active = rows.filter((row) => row.votes7 > 0);
  if (active.length >= 3) {
    return active.sort((a, b) => b.votes7 - a.votes7 || Math.abs(b.drift) - Math.abs(a.drift)).slice(0, limit);
  }
  // A quiet week still deserves a feed: show the strongest movers by drift.
  return rows
    .filter((row) => Math.abs(row.drift) > 0)
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))
    .slice(0, limit);
}

/* --------------------------------- value --------------------------------- */

export type ValueRow = {
  stat: AiStat;
  /** cheapest paid monthly plan, or null for a free tool */
  monthly: number | null;
  /** USD per rating point per month — lower is better */
  costPerPoint: number | null;
  planName: string;
  free: boolean;
};

/**
 * Value = what one rating point costs per month on the cheapest paid plan.
 * Free tools are listed separately instead of pretending to divide by zero.
 */
export function valueRows(view: View, limit = 12): { paid: ValueRow[]; free: ValueRow[] } {
  // Value only means something for a tool that has actually been rated.
  const rows: ValueRow[] = [...view.aiStats.values()]
    .filter((stat) => !stat.ai.hidden && stat.score > 0 && stat.votes > 0)
    .map((stat) => {
      const paidPlans = (stat.ai.plans ?? []).filter((plan) => plan.priceMonthly > 0);
      const monthly = paidPlans.length
        ? Math.min(...paidPlans.map((plan) => plan.priceMonthly))
        : stat.ai.planPrice > 0
          ? stat.ai.planPrice
          : null;
      const cheapest = paidPlans.sort((a, b) => a.priceMonthly - b.priceMonthly)[0];
      const free = stat.ai.priceType === "free" || monthly === null;
      return {
        stat,
        monthly: free ? null : monthly,
        costPerPoint: free || !monthly ? null : monthly / Math.max(1, stat.score),
        planName: free ? "Free tier" : (cheapest?.name ?? "Starting plan"),
        free,
      };
    });

  const paid = rows
    .filter((row) => !row.free)
    .sort((a, b) => (a.costPerPoint ?? Infinity) - (b.costPerPoint ?? Infinity) || b.stat.score - a.stat.score)
    .slice(0, limit);
  const free = rows.filter((row) => row.free).sort((a, b) => b.stat.score - a.stat.score).slice(0, 8);
  return { paid, free };
}

/* ------------------------------- listings -------------------------------- */

/** Tools with no real ratings yet — the honest "unranked" shelf. */
export function awaitingRatings(view: View, limit = 8): AiStat[] {
  return [...view.aiStats.values()]
    .filter((stat) => !stat.ai.hidden && stat.modelVotes === 0)
    .sort((a, b) => b.weeklyVisits - a.weeklyVisits || +new Date(b.ai.createdAt) - +new Date(a.ai.createdAt))
    .slice(0, limit);
}
