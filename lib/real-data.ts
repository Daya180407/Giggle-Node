import type { DB } from "./types";

/**
 * Removes invented social proof so every rating, review, vote and visit number
 * on the public site comes from a real visitor.
 *
 * The original demo document shipped 240 reviewer accounts, ~15.8k generated
 * ratings (about one in six with a written review) and a `demoStars` /
 * `demoVotes` aggregate that read as "5M+ people rated". None of that was a
 * real opinion, so it is deleted exactly once per document. Editorial catalogue
 * content (tools, models, pricing, prompts, posts) is left alone.
 */
const REAL_DATA_VERSION = 6;

const FAKE_OWNED_COLLECTIONS = [
  "bookmarks",
  "follows",
  "pointEvents",
  "priceAlerts",
  "communityMembers",
  "aiVisits",
] as const;

export function stripFabricatedRatings(db: DB): boolean {
  if (db.version >= REAL_DATA_VERSION) return false;

  const fabricatedUsers = new Set(db.users.filter((user) => user.isSeed).map((user) => user.id));
  // The shared demo login was only ever used for end-to-end testing, so its
  // sample reviews and QA ratings are test data, not community opinion.
  const testReviewers = new Set([...fabricatedUsers, "u_demo"]);

  db.ratings = db.ratings.filter(
    (rating) => !testReviewers.has(rating.userId) && !rating.id.startsWith("rt_demo_"),
  );
  db.users = db.users.filter((user) => !fabricatedUsers.has(user.id));

  for (const key of FAKE_OWNED_COLLECTIONS) {
    const rows = db[key] as { userId?: string }[] | undefined;
    if (Array.isArray(rows)) {
      (db[key] as unknown as { userId?: string }[]) = rows.filter(
        (row) => !row.userId || !fabricatedUsers.has(row.userId),
      );
    }
  }

  if (Array.isArray(db.helpfulVotes)) {
    db.helpfulVotes = db.helpfulVotes.filter((vote) => !fabricatedUsers.has(vote.voter));
  }
  if (Array.isArray(db.communityMessages)) {
    db.communityMessages = db.communityMessages.filter((message) => !fabricatedUsers.has(message.userId));
  }
  if (Array.isArray(db.notifications)) {
    for (const notification of db.notifications) {
      if (notification.readBy) {
        notification.readBy = notification.readBy.filter((id) => !fabricatedUsers.has(id));
      }
    }
  }

  // Seeded traffic counters were invented too; /go now grows them from real clicks.
  for (const ai of db.ai) {
    if (ai.visits) ai.visits = 0;
  }

  db.version = REAL_DATA_VERSION;
  return true;
}
