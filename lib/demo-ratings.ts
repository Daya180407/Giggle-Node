import { buildView } from "./rank";
import type { DB } from "./types";

/**
 * Demo-only rating totals.
 *
 * The directory has very little organic traffic, so every tool page showed a
 * couple of hundred votes. This migration gives each model a realistic demo
 * aggregate instead: the best-ranked tool reads 4.9★ with 5M+ people rated,
 * and the ladder tapers down to ~3.8★ at the tail.
 *
 * `demoStars` / `demoVotes` are stored on the model and blended into the
 * weighted score exactly like old votes (see `buildView`), so the ranking
 * formula, comparison pages, badges and JSON-LD all stay consistent. No fake
 * user accounts or rating rows are created, and real votes still add on top.
 * Models of the same AI stay within 0.1★ of each other, so a flagship's
 * smaller model never falls to the bottom of the whole directory.
 *
 * Demo data only: clear `demoStars` / `demoVotes` before the site starts
 * relying on real traffic.
 */
export function applyDemoRatings(db: DB): boolean {
  if (db.version >= 3) return false;

  const view = buildView(db);
  const ranked = [...view.aiStats.values()]
    .filter((stat) => !stat.ai.hidden)
    .sort((a, b) => b.score - a.score || b.ai.visits - a.ai.visits);

  const total = ranked.length;
  // The flagship model carries the full count; sibling models taper off.
  const MODEL_SHARE = [1, 0.45, 0.2];

  ranked.forEach((stat, index) => {
    const position = total > 1 ? index / (total - 1) : 0;
    // Ladder keeps the visible order intact: #1 sits at 4.9★/5M+, the tail at
    // 3.8★ with about a thousand votes.
    const aiStars = Math.round((4.9 - 1.1 * Math.pow(position, 0.85)) * 10) / 10;
    const share = Math.pow(1 - position, 2);
    const aiVotes = 1_000 + Math.round((4_999_000 * share) / 100) * 100;

    const models = [...stat.models].sort((a, b) => b.score - a.score);
    models.forEach((modelStat, modelIndex) => {
      const stars = Math.max(3.5, Math.round((aiStars - modelIndex * 0.1) * 10) / 10);
      const shareOfVotes = MODEL_SHARE[modelIndex] ?? 0.1;
      modelStat.model.demoStars = stars;
      modelStat.model.demoVotes = Math.max(100, Math.round((aiVotes * shareOfVotes) / 100) * 100);
    });
  });

  db.version = 3;
  return true;
}
