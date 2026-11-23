import type { AiStat, View } from "./rank";
import type { ArenaVote, DB } from "./types";
import { categoryName } from "./categories";
import { rankedAis } from "./rank";

export type ArenaRecord = { wins: number; losses: number; total: number; rate: number };

/** A contender stripped to the facts shown before the reveal (no brand, no score). */
export type ArenaContender = {
  id: string;
  slug: string;
  name: string;
  logo: string;
  color: string;
  score: number;
  category: string;
  description: string;
  bestFor: string[];
  priceType: string;
};

/**
 * One category's contenders. Both cards of a round come from the same pool, so
 * a pick answers "which of these two for this job" instead of pitting a design
 * tool against a coding assistant, where neither answer means anything.
 */
export type ArenaPool = { category: string; label: string; contenders: ArenaContender[] };

/** Which pool and which two contenders are on the screen. */
export type ArenaRound = { pool: number; a: number; b: number };

export function arenaContenders(view: View, limit = 240): ArenaContender[] {
  return rankedAis(view)
    .filter((stat) => !stat.ai.sponsored || stat.ai.boost === 0)
    .slice(0, limit)
    .map((stat) => ({
      id: stat.ai.id,
      slug: stat.ai.slug,
      name: stat.ai.name,
      logo: stat.ai.logo,
      color: stat.ai.color,
      score: stat.score,
      category: stat.ai.category,
      description: stat.ai.description,
      bestFor: stat.ai.bestFor.slice(0, 3),
      priceType: stat.ai.priceType,
    }));
}

/**
 * The built-in catch-all category mixes health, finance, legal and browser
 * tools, so it is the loosest comparison on the site; it goes last instead of
 * opening the arena.
 */
const CATCH_ALL = "specialized";

/** Categories with at least two public contenders; busiest specific category first. */
export function arenaPools(contenders: ArenaContender[]): ArenaPool[] {
  const byCategory = new Map<string, ArenaContender[]>();
  for (const contender of contenders) {
    const list = byCategory.get(contender.category) ?? [];
    list.push(contender);
    byCategory.set(contender.category, list);
  }
  return [...byCategory.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([category, list]) => ({ category, label: categoryName(category), contenders: list }))
    .sort(
      (a, b) =>
        Number(a.category === CATCH_ALL) - Number(b.category === CATCH_ALL) ||
        b.contenders.length - a.contenders.length ||
        a.label.localeCompare(b.label),
    );
}

/**
 * A pick only says something about quality when both tools do the same job.
 * Pairs from two different categories (stored before the pools existed) are
 * left out of the win rate instead of being compared across categories.
 */
function fairVotes(db: DB): ArenaVote[] {
  const categoryOf = new Map(db.ai.map((ai) => [ai.id, ai.category]));
  return (db.arenaVotes ?? []).filter((vote) => {
    const category = categoryOf.get(vote.aId);
    return Boolean(category) && categoryOf.get(vote.bId) === category;
  });
}

/** Wins and losses per AI from the stored same-category arena picks. */
export function arenaRecords(db: DB): Map<string, ArenaRecord> {
  const map = new Map<string, ArenaRecord>();
  for (const vote of fairVotes(db)) {
    const win = map.get(vote.winnerId) ?? { wins: 0, losses: 0, total: 0, rate: 0 };
    win.wins += 1;
    win.total += 1;
    map.set(vote.winnerId, win);

    const other = vote.aId === vote.winnerId ? vote.bId : vote.aId;
    const loss = map.get(other) ?? { wins: 0, losses: 0, total: 0, rate: 0 };
    loss.losses += 1;
    loss.total += 1;
    map.set(other, loss);
  }
  for (const record of map.values()) {
    record.rate = record.total ? record.wins / record.total : 0;
  }
  return map;
}

/** Community picks that counted: same-category pairs only. */
export function arenaTotal(db: DB): number {
  return fairVotes(db).length;
}

function matchups(records: Record<string, ArenaRecord>, id: string): number {
  return records[id]?.total ?? 0;
}

function byFewestMatchups(list: ArenaContender[], records: Record<string, ArenaRecord>, indices: number[]): number[] {
  const min = Math.min(...indices.map((i) => matchups(records, list[i].id)));
  return indices.filter((i) => matchups(records, list[i].id) === min);
}

/**
 * The second card prefers the first card's price tier, so a free tool is not
 * losing to a $20 one by default, then a shared best-for tag, so two tools in a
 * broad category are still asked about the same kind of work. Matchups decide
 * the rest.
 */
function partnerIndex(list: ArenaContender[], records: Record<string, ArenaRecord>, a: number): number {
  const rest = list.map((_, i) => i).filter((i) => i !== a);
  const scored = rest.map((i) => ({
    i,
    tier: list[i].priceType === list[a].priceType ? 0 : 1,
    tag: list[i].bestFor.some((tag) => list[a].bestFor.includes(tag)) ? 0 : 1,
  }));
  const bestTier = Math.min(...scored.map((s) => s.tier));
  const tierPool = scored.filter((s) => s.tier === bestTier);
  const bestTag = Math.min(...tierPool.map((s) => s.tag));
  const tagPool = tierPool.filter((s) => s.tag === bestTag).map((s) => s.i);
  const fewest = byFewestMatchups(list, records, tagPool);
  return [...fewest].sort((i, j) => list[j].score - list[i].score || list[i].id.localeCompare(list[j].id))[0];
}

/**
 * Deterministic opening round so the server render and the client hydration
 * agree: the busiest category, then whoever has the fewest matchups.
 */
export function initialRound(pools: ArenaPool[], records: Record<string, ArenaRecord>): ArenaRound {
  if (!pools.length) return { pool: 0, a: 0, b: 0 };
  const list = pools[0].contenders;
  if (list.length < 2) return { pool: 0, a: 0, b: 0 };
  const fewest = byFewestMatchups(
    list,
    records,
    list.map((_, i) => i),
  );
  const a = [...fewest].sort((i, j) => list[j].score - list[i].score || list[i].id.localeCompare(list[j].id))[0];
  return { pool: 0, a, b: partnerIndex(list, records, a) };
}

/**
 * A round inside one chosen category: both cards come from `pools[poolIndex]`,
 * so a category pick never mixes jobs. An out-of-range index falls back to the
 * first pool instead of rendering an empty board.
 */
export function roundInPool(
  pools: ArenaPool[],
  poolIndex: number,
  records: Record<string, ArenaRecord>,
  random: () => number = Math.random,
): ArenaRound {
  if (!pools.length) return { pool: 0, a: 0, b: 0 };
  const index = Math.min(Math.max(poolIndex, 0), pools.length - 1);
  const list = pools[index].contenders ?? [];
  if (list.length < 2) return { pool: index, a: 0, b: 0 };
  const aCandidates = byFewestMatchups(
    list,
    records,
    list.map((_, i) => i),
  );
  const a = aCandidates[Math.min(aCandidates.length - 1, Math.floor(random() * aCandidates.length))];
  return { pool: index, a, b: partnerIndex(list, records, a) };
}

/**
 * One leader per category instead of one table across every category: a 100%
 * image-tool record is not comparable to a 100% coding record, but it is a fair
 * leader inside its own pool.
 */
export function topArenaPicks(db: DB, view: View, limit = 8) {
  const records = arenaRecords(db);
  const best = new Map<string, { stat: AiStat; record: ArenaRecord }>();
  for (const stat of view.aiStats.values()) {
    if (stat.ai.hidden) continue;
    const record = records.get(stat.ai.id);
    if (!record || record.total < 2) continue;
    const current = best.get(stat.ai.category);
    if (
      !current ||
      record.rate > current.record.rate ||
      (record.rate === current.record.rate && record.total > current.record.total)
    ) {
      best.set(stat.ai.category, { stat, record });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.record.total - a.record.total || b.record.rate - a.record.rate)
    .slice(0, limit);
}

export type { AiStat };
