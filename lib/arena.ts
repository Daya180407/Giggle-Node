import type { AiStat, View } from "./rank";
import type { DB } from "./types";
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

export function arenaContenders(view: View, limit = 24): ArenaContender[] {
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

/** Wins and losses per AI from the stored arena picks. */
export function arenaRecords(db: DB): Map<string, ArenaRecord> {
  const map = new Map<string, ArenaRecord>();
  for (const vote of db.arenaVotes ?? []) {
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

export function arenaTotal(db: DB): number {
  return (db.arenaVotes ?? []).length;
}

/**
 * Deterministic opening pair so the server render and the client hydration
 * agree. Later pairs are drawn client-side from the same list.
 */
export function initialPair(contenders: ArenaContender[]): [number, number] {
  if (contenders.length < 2) return [0, 0];
  const a = 0;
  const b = Math.min(contenders.length - 1, Math.max(1, Math.ceil(contenders.length / 2)));
  return [a, b];
}

export function topArenaPicks(db: DB, view: View, limit = 8) {
  const records = arenaRecords(db);
  return [...view.aiStats.values()]
    .filter((stat) => !stat.ai.hidden && (records.get(stat.ai.id)?.total ?? 0) >= 1)
    .sort((a, b) => {
      const ra = records.get(a.ai.id)!;
      const rb = records.get(b.ai.id)!;
      return rb.rate - ra.rate || rb.total - ra.total;
    })
    .slice(0, limit)
    .map((stat) => ({ stat, record: records.get(stat.ai.id)! }));
}

export type { AiStat };
