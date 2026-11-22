import { getSiteSettings } from "./settings";
import type { DB, User } from "./types";

export type ContributorRow = {
  user: User;
  ratings: number;
  reviews: number;
  points: number;
  badges: string[];
};

export function badgesFor(db: DB, user: User, points: number): string[] {
  const settings = getSiteSettings(db).gamification;
  const badges: string[] = [];
  if (settings.badgeExpert > 0 && points >= settings.badgeExpert) badges.push("Expert");
  if (settings.badgeTopReviewer > 0 && points >= settings.badgeTopReviewer) badges.push("Top Reviewer");
  if (settings.newUserDays > 0 && Date.now() - +new Date(user.createdAt) <= settings.newUserDays * 86400000) {
    badges.push("New User");
  }
  if (user.verified) badges.push("Verified");
  return badges;
}

/**
 * Points are derived from approved contributions, not a mutable counter, so a
 * deleted rating removes its points too. `monthlyReset` only counts activity
 * after the last reset date.
 */
export function pointBoard(db: DB, limit = 10): ContributorRow[] {
  const settings = getSiteSettings(db).gamification;
  const since = settings.monthlyReset && settings.lastResetAt ? +new Date(settings.lastResetAt) : 0;
  const users = new Map<string, User>(db.users.map((user) => [user.id, user]));
  const rows = new Map<string, { ratings: number; reviews: number }>();

  for (const rating of db.ratings) {
    if (rating.status === "rejected") continue;
    if (+new Date(rating.createdAt) < since) continue;
    const row = rows.get(rating.userId) ?? { ratings: 0, reviews: 0 };
    row.ratings += 1;
    if (rating.review && rating.review.trim().length > 0) row.reviews += 1;
    rows.set(rating.userId, row);
  }

  return [...rows.entries()]
    .map(([userId, row]) => {
      const user = users.get(userId);
      if (!user) return null;
      const points = row.ratings * settings.pointsPerRating + row.reviews * settings.pointsPerReview;
      return { user, ratings: row.ratings, reviews: row.reviews, points, badges: badgesFor(db, user, points) };
    })
    .filter((row): row is ContributorRow => Boolean(row))
    .sort((a, b) => b.points - a.points || b.ratings - a.ratings)
    .slice(0, limit);
}
