import type { Ai, CategorySlug, DB, Model, Post, Prompt, User } from "./types";

export const PRIOR_VOTES = 50;
/** A board medal needs at least this many real votes; below it we show "Early signal". */
export const RATED_MIN_VOTES = 10;
export const RECENT_DAYS = 30;
export const RECENT_MULTIPLIER = 1.5;
/** An overall vote covers every model, so it weighs more than a single model vote. */
export const AI_VOTE_WEIGHT = 2;

export type Trend = "up" | "down" | "flat";

export type ModelStat = {
  model: Model;
  ai: Ai;
  votes: number;
  avg: number;
  score: number;
  dist: number[];
  recentVotes: number;
  recentAvg: number;
  trend: Trend;
  last7: number;
};

export type AiStat = {
  ai: Ai;
  /** headline score: model votes blended with AI-level overall votes */
  score: number;
  /** score built from model votes only (the pre-overall-rating number) */
  modelScore: number;
  /** model votes + AI-level overall votes */
  votes: number;
  modelVotes: number;
  /** AI-level (whole product) votes */
  aiVotes: number;
  aiAvg: number;
  aiDist: number[];
  avg: number;
  dist: number[];
  trend: Trend;
  models: ModelStat[];
  last7: number;
  weeklyVisits: number;
  trendingScore: number;
};

export type View = {
  db: DB;
  globalAvg: number;
  modelStats: Map<string, ModelStat>;
  aiStats: Map<string, AiStat>;
  aiBySlug: Map<string, Ai>;
  aiById: Map<string, Ai>;
  modelById: Map<string, Model>;
  modelsByAi: Map<string, Model[]>;
};

/** 30 din ke andar 1.5x weight, 90 din tak 1.0 tak girta hai, uske baad slow decay. */
export function recencyWeight(createdAt: string, now = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(createdAt).getTime()) / 86400000);
  if (ageDays <= RECENT_DAYS) return RECENT_MULTIPLIER;
  if (ageDays <= 90) return RECENT_MULTIPLIER - (0.5 * (ageDays - RECENT_DAYS)) / 60;
  return Math.max(0.6, 1 - ((ageDays - 90) / 365) * 0.4);
}

export function buildView(db: DB): View {
  const now = Date.now();
  // Pending and rejected reviews must never move a public score.
  const ratings = db.ratings.filter((r) => r.status !== "pending" && r.status !== "rejected");
  let weightSum = 0;
  let weightedStars = 0;
  for (const r of ratings) {
    const w = recencyWeight(r.createdAt, now);
    weightSum += w;
    weightedStars += w * r.stars;
  }
  const globalAvg = weightSum > 0 ? weightedStars / weightSum : 4;

  const modelStats = new Map<string, ModelStat>();
  const modelById = new Map<string, Model>();
  const aiById = new Map<string, Ai>();
  const aiBySlug = new Map<string, Ai>();
  const modelsByAi = new Map<string, Model[]>();

  for (const ai of db.ai) {
    aiById.set(ai.id, ai);
    aiBySlug.set(ai.slug, ai);
  }
  for (const m of db.models) {
    modelById.set(m.id, m);
    const list = modelsByAi.get(m.aiId) ?? [];
    list.push(m);
    modelsByAi.set(m.aiId, list);
  }

  type Acc = {
    votes: number;
    wSum: number;
    wStars: number;
    dist: number[];
    recentVotes: number;
    recentStars: number;
    last7: number;
    /** real rating rows only, used for the trend arrow */
    realVotes: number;
    realStars: number;
  };
  const acc = new Map<string, Acc>();
  for (const m of db.models) {
    acc.set(m.id, {
      votes: 0,
      wSum: 0,
      wStars: 0,
      dist: [0, 0, 0, 0, 0],
      recentVotes: 0,
      recentStars: 0,
      last7: 0,
      realVotes: 0,
      realStars: 0,
    });
  }

  // Demo totals count as old, full-weight votes, so a seeded 4.9★ average is
  // not pulled toward the directory average by the 50-vote prior. Real votes
  // keep landing on top of them.
  for (const m of db.models) {
    const demoVotes = Math.max(0, Math.round(m.demoVotes ?? 0));
    const demoStars = Math.max(0, Math.min(5, m.demoStars ?? 0));
    const a = acc.get(m.id);
    if (!a || demoVotes === 0 || demoStars === 0) continue;
    a.votes += demoVotes;
    a.wSum += demoVotes;
    a.wStars += demoVotes * demoStars;
    const spread = [1, 2, 3, 4, 5].map((stars) => Math.exp(-Math.pow(stars - demoStars, 2) / 0.8));
    const spreadTotal = spread.reduce((sum, n) => sum + n, 0);
    for (let i = 0; i < 5; i++) a.dist[i] += Math.round((spread[i] / spreadTotal) * demoVotes);
  }

  for (const r of ratings) {
    // AI-level rows carry no model; they are scored separately below.
    if (!r.modelId) continue;
    const a = acc.get(r.modelId);
    if (!a) continue;
    const ageDays = Math.max(0, (now - new Date(r.createdAt).getTime()) / 86400000);
    const w = recencyWeight(r.createdAt, now);
    a.votes += 1;
    a.realVotes += 1;
    a.realStars += r.stars;
    a.wSum += w;
    a.wStars += w * r.stars;
    a.dist[Math.min(5, Math.max(1, r.stars)) - 1] += 1;
    if (ageDays <= RECENT_DAYS) {
      a.recentVotes += 1;
      a.recentStars += r.stars;
    }
    if (ageDays <= 7) a.last7 += 1;
  }

  // AI-level (overall) votes, kept apart from the per-model counters.
  type AiAcc = { votes: number; wSum: number; wStars: number; dist: number[]; last7: number };
  const aiAcc = new Map<string, AiAcc>();
  for (const r of ratings) {
    if (r.modelId || !r.aiId) continue;
    const a = aiAcc.get(r.aiId) ?? { votes: 0, wSum: 0, wStars: 0, dist: [0, 0, 0, 0, 0], last7: 0 };
    const ageDays = Math.max(0, (now - new Date(r.createdAt).getTime()) / 86400000);
    const w = recencyWeight(r.createdAt, now);
    a.votes += 1;
    a.wSum += w;
    a.wStars += w * r.stars;
    a.dist[Math.min(5, Math.max(1, r.stars)) - 1] += 1;
    if (ageDays <= 7) a.last7 += 1;
    aiAcc.set(r.aiId, a);
  }

  const aiStats = new Map<string, AiStat>();
  for (const ai of db.ai) {
    const models = modelsByAi.get(ai.id) ?? [];
    const mstats: ModelStat[] = models.map((model) => {
      const a = acc.get(model.id)!;
      const avg = a.wSum > 0 ? a.wStars / a.wSum : 0;
      const score =
        a.votes > 0
          ? (a.votes / (a.votes + PRIOR_VOTES)) * avg + (PRIOR_VOTES / (a.votes + PRIOR_VOTES)) * globalAvg
          : globalAvg;
      const recentAvg = a.recentVotes > 0 ? a.recentStars / a.recentVotes : avg;
      // Trend compares real recent votes with the model's own real average, so
      // demo totals do not turn every arrow into a downward one.
      const realAvg = a.realVotes > 0 ? a.realStars / a.realVotes : 0;
      const trend: Trend =
        a.realVotes === 0 || a.recentVotes === 0
          ? "flat"
          : recentAvg > realAvg + 0.06
            ? "up"
            : recentAvg < realAvg - 0.06
              ? "down"
              : "flat";
      const modelStat: ModelStat = {
        model,
        ai,
        votes: a.votes,
        avg,
        score,
        dist: a.dist,
        recentVotes: a.recentVotes,
        recentAvg,
        trend,
        last7: a.last7,
      };
      modelStats.set(model.id, modelStat);
      return modelStat;
    });

    // Pinned models stay on top, the rest follow the live score.
    mstats.sort((a, b) => Number(Boolean(b.model.pin)) - Number(Boolean(a.model.pin)) || b.score - a.score);

    const totalVotes = mstats.reduce((s, m) => s + m.votes, 0);
    const weightedScore = totalVotes
      ? mstats.reduce((s, m) => s + m.score * m.votes, 0) / totalVotes
      : globalAvg;

    // Overall votes are shrunk toward the model score, so a single overall vote
    // cannot swing a tool with no model votes all the way to 1★ or 5★.
    const overall = aiAcc.get(ai.id);
    const aiVotes = overall?.votes ?? 0;
    const aiAvg = overall && overall.wSum > 0 ? overall.wStars / overall.wSum : 0;
    const aiDist = overall?.dist ?? [0, 0, 0, 0, 0];
    const aiLayer =
      aiVotes > 0 ? (aiVotes * aiAvg + PRIOR_VOTES * weightedScore) / (aiVotes + PRIOR_VOTES) : weightedScore;
    // With no overall votes this is exactly the model score, so the existing ranking never flattens.
    const overallScore =
      aiVotes > 0
        ? (totalVotes * weightedScore + AI_VOTE_WEIGHT * aiVotes * aiLayer) /
          (totalVotes + AI_VOTE_WEIGHT * aiVotes)
        : weightedScore;
    const avg = mstats.reduce((s, m) => s + m.recentAvg * m.votes, 0) / (totalVotes || 1);
    const dist = [0, 0, 0, 0, 0];
    for (const m of mstats) for (let i = 0; i < 5; i++) dist[i] += m.dist[i];
    for (let i = 0; i < 5; i++) dist[i] += aiDist[i];
    const last7 = mstats.reduce((s, m) => s + m.last7, 0) + (overall?.last7 ?? 0);
    const recentAvg = mstats
      .filter((m) => m.recentVotes > 0)
      .reduce((s, m) => s + m.recentAvg * m.recentVotes, 0) /
      (mstats.reduce((s, m) => s + m.recentVotes, 0) || 1);
    const recentVotes = mstats.reduce((s, m) => s + m.recentVotes, 0);
    const trend: Trend =
      recentVotes === 0 ? "flat" : recentAvg > avg + 0.06 ? "up" : recentAvg < avg - 0.06 ? "down" : "flat";
    const weeklyVisits = Math.round(ai.visits * 0.048);

    aiStats.set(ai.id, {
      ai,
      score: overallScore,
      modelScore: weightedScore,
      votes: totalVotes + aiVotes,
      modelVotes: totalVotes,
      aiVotes,
      aiAvg,
      aiDist,
      avg,
      dist,
      trend,
      models: mstats,
      last7,
      weeklyVisits,
      trendingScore: weeklyVisits + last7 * 120,
    });
  }

  return { db, globalAvg, modelStats, aiStats, aiBySlug, aiById, modelById, modelsByAi };
}

export function sortByRank(list: AiStat[]): AiStat[] {
  return [...list].sort((a, b) => {
    // A tool nobody has rated is listed after every tool that has real votes.
    const aRated = a.votes > 0 ? 1 : 0;
    const bRated = b.votes > 0 ? 1 : 0;
    if (aRated !== bRated) return bRated - aRated;
    const aScore = a.score + a.ai.boost;
    const bScore = b.score + b.ai.boost;
    if (Math.abs(bScore - aScore) > 0.0001) return bScore - aScore;
    return b.votes - a.votes;
  });
}

export function rankedAis(view: View, category?: CategorySlug | "all"): AiStat[] {
  const all = [...view.aiStats.values()].filter((s) => !s.ai.hidden);
  const filtered = !category || category === "all" ? all : all.filter((s) => s.ai.category === category);
  return sortByRank(filtered);
}

export function trendingAis(view: View, limit = 4, manualIds: string[] = []): AiStat[] {
  const publicStats = [...view.aiStats.values()].filter((s) => !s.ai.hidden);
  const manual = manualIds
    .map((id) => publicStats.find((s) => s.ai.id === id))
    .filter((s): s is AiStat => Boolean(s));
  if (manual.length > 0) {
    if (manual.length >= limit) return manual.slice(0, limit);
    const rest = publicStats
      .filter((s) => !manualIds.includes(s.ai.id))
      .sort((a, b) => b.trendingScore - a.trendingScore || b.votes - a.votes)
      .slice(0, limit - manual.length);
    return [...manual, ...rest];
  }
  return publicStats.sort((a, b) => b.trendingScore - a.trendingScore || b.votes - a.votes).slice(0, limit);
}

export function risingAis(view: View, limit = 6): AiStat[] {
  const cutoff = Date.now() - 120 * 86400000;
  return [...view.aiStats.values()]
    .filter((s) => !s.ai.hidden && new Date(s.ai.createdAt).getTime() >= cutoff && s.votes < 160 && s.score >= 4.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Manual champion for a category, or the featured tool when an admin ticked one. */
export function championFor(view: View, category: CategorySlug, overrides: Record<string, string> = {}): AiStat[] {
  const ranked = rankedAis(view, category);
  const overrideId = overrides[category] ?? ranked.find((s) => s.ai.featured)?.ai.id;
  if (!overrideId) return ranked;
  const picked = ranked.find((s) => s.ai.id === overrideId);
  if (!picked) return ranked;
  return [picked, ...ranked.filter((s) => s.ai.id !== overrideId)];
}

export type DistRow = { stars: number; count: number; percent: number };

export function distribution(dist: number[]): DistRow[] {
  const total = dist.reduce((s, n) => s + n, 0);
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = dist[stars - 1] ?? 0;
    return { stars, count, percent: total ? Math.round((count / total) * 1000) / 10 : 0 };
  });
}

export function modelReviews(db: DB, modelId: string, limit?: number) {
  const users = new Map<string, User>(db.users.map((u) => [u.id, u]));
  const rows = db.ratings
    .filter(
      (r) =>
        r.modelId === modelId &&
        r.review &&
        r.review.trim().length > 0 &&
        r.status !== "pending" &&
        r.status !== "rejected",
    )
    .sort((a, b) => b.stars - a.stars || +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((r) => ({ rating: r, user: users.get(r.userId) }));
  return limit ? rows.slice(0, limit) : rows;
}

export function aiReviews(db: DB, aiId: string, limit?: number) {
  const users = new Map<string, User>(db.users.map((u) => [u.id, u]));
  const modelIds = new Set(db.models.filter((m) => m.aiId === aiId).map((m) => m.id));
  const rows = db.ratings
    .filter(
      (r) =>
        (modelIds.has(r.modelId ?? "") || r.aiId === aiId) &&
        r.review &&
        r.review.trim().length > 0 &&
        r.status !== "pending" &&
        r.status !== "rejected",
    )
    .sort((a, b) => b.stars - a.stars || +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((r) => ({ rating: r, user: users.get(r.userId) }));
  return limit ? rows.slice(0, limit) : rows;
}

export function contributorBoard(db: DB, limit = 10) {
  const users = new Map<string, User>(db.users.map((u) => [u.id, u]));
  const scores = new Map<string, { ratings: number; reviews: number; helpful: number; score: number }>();
  for (const r of db.ratings) {
    const row = scores.get(r.userId) ?? { ratings: 0, reviews: 0, helpful: 0, score: 0 };
    row.ratings += 1;
    if (r.review && r.review.trim().length > 0) row.reviews += 1;
    row.score = row.ratings + row.reviews * 3;
    scores.set(r.userId, row);
  }
  return [...scores.entries()]
    .map(([userId, s]) => ({ user: users.get(userId), ...s }))
    .filter((row): row is { user: User; ratings: number; reviews: number; helpful: number; score: number } => Boolean(row.user))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function publishedPosts(db: DB): Post[] {
  const now = Date.now();
  return db.posts
    .filter(
      (p) =>
        p.status === "published" ||
        (p.status === "scheduled" && Boolean(p.scheduledAt) && +new Date(p.scheduledAt as string) <= now),
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Total visits across the catalogue, minus hidden tools. */
export function mostVisited(view: View, limit = 5): AiStat[] {
  return [...view.aiStats.values()]
    .filter((s) => !s.ai.hidden)
    .sort((a, b) => b.ai.visits - a.ai.visits)
    .slice(0, limit);
}

export function promptsFor(db: DB, aiId: string): Prompt[] {
  return db.prompts.filter((p) => p.aiId === aiId);
}

/**
 * Editorial prompts (written by the site team, no community submitter) are the
 * checked ones, so they show a verified tick. Community prompts are always
 * unverified until an admin adds them from the panel.
 */
export function isVerifiedPrompt(p: Prompt): boolean {
  return p.submittedBy ? Boolean(p.verified) : true;
}

export function timeAgo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  return `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "year" : "years"} ago`;
}

export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function searchAll(view: View, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { ais: [] as AiStat[], models: [] as ModelStat[], posts: [] as Post[] };
  const words = q.split(/\s+/);
  const matches = (haystack: string) => words.every((w) => haystack.toLowerCase().includes(w));

  const ais = [...view.aiStats.values()].filter((s) => {
    if (s.ai.hidden) return false;
    const hay = [s.ai.name, s.ai.category, s.ai.description, ...s.ai.bestFor, ...s.models.map((m) => m.model.name)].join(" ");
    return matches(hay);
  });
  const models = [...view.modelStats.values()].filter(
    (m) => !m.ai.hidden && matches([m.model.name, m.model.bestFor, m.ai.name].join(" ")),
  );
  const posts = view.db.posts.filter(
    (p) => p.status === "published" && matches([p.title, p.excerpt, p.content].join(" ")),
  );
  return { ais: sortByRank(ais), models, posts };
}
