import { applyCatalogue } from "./catalogue/apply";
import { CATEGORIES } from "./categories";
import { backfillCommunity } from "./community";
import { SEED_ACCOUNTS } from "./seed-accounts";
import { localizeContentToEnglish } from "./localize-en";
import { stripFabricatedRatings } from "./real-data";
import { resolveRoles } from "./roles";
import { DEFAULT_SITE_SETTINGS } from "./settings";
import type { DB } from "./types";

/**
 * Backfills fields introduced after the first data snapshot (older R2 documents)
 * and gives the seeded admin account a password hash exactly once.
 * Deliberately synchronous work only: this runs during Worker startup.
 */
export async function migrateDb(db: DB): Promise<boolean> {
  let changed = false;

  if (!Array.isArray(db.authEvents)) {
    db.authEvents = [];
    changed = true;
  }

  if (!Array.isArray(db.adminLog)) {
    db.adminLog = [];
    changed = true;
  }

  if (!Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = CATEGORIES;
    changed = true;
  }

  if (!Array.isArray(db.searchLogs)) {
    db.searchLogs = [];
    changed = true;
  }

  const collections = [
    "notifications",
    "emailOutbox",
    "searchCache",
    "searchAiReports",
    "searchRequests",
    "media",
    "pages",
    "traffic",
    "feedback",
    "pointEvents",
    "changelog",
    "pricingReports",
    "toolSubmissions",
    "priceHistory",
    "priceAlerts",
    "subscribers",
    "claimRequests",
    "reviewReplies",
    "aiVisits",
    "arenaVotes",
    "ownerAccounts",
    "aiOwners",
    "ownerRequests",
    "ownerChanges",
    "sponsorPlacements",
    "sponsorRequests",
    "chatAds",
    "communityReports",
    "communityBans",
  ] as const;
  for (const key of collections) {
    if (!Array.isArray(db[key])) {
      (db as unknown as Record<string, unknown>)[key] = [];
      changed = true;
    }
  }

  if (!db.appPricing || typeof db.appPricing !== "object" || Array.isArray(db.appPricing)) {
    db.appPricing = {};
    changed = true;
  }

  const rolesBefore = JSON.stringify(db.roles ?? null);
  db.roles = resolveRoles(db.roles);
  if (JSON.stringify(db.roles) !== rolesBefore) changed = true;

  const settingsBefore = JSON.stringify(db.settings ?? null);
  db.settings = { ...DEFAULT_SITE_SETTINGS, ...(db.settings ?? {}) };
  // The old built-in default was 8; ads now sit after every 20 messages.
  if (db.settings.community && db.settings.community.adEvery === 8) {
    db.settings = { ...db.settings, community: { ...db.settings.community, adEvery: 20 } };
  }
  if (JSON.stringify(db.settings) !== settingsBefore) changed = true;

  for (const account of SEED_ACCOUNTS) {
    const user = db.users.find((u) => u.email.toLowerCase() === account.email);
    if (!user) continue;
    // 150k-iteration hashes were written by an early build and cannot be verified on Workers.
    const legacyUnsupported = user.passwordHash?.startsWith("pbkdf2$150000$");
    if (!user.passwordHash || legacyUnsupported) {
      user.passwordHash = account.passwordHash;
      changed = true;
    }
  }

  // A fresh site keeps no shared demo login and no QA test accounts. This is
  // idempotent: once removed, nothing matches on later boots.
  const testAccount = (email: string) =>
    email.toLowerCase() === "demo@giglenode.com" || email.toLowerCase().endsWith("@giglenode.test");
  const removable = db.users.filter((user) => testAccount(user.email));
  if (removable.length) {
    const ids = new Set(removable.map((user) => user.id));
    db.users = db.users.filter((user) => !ids.has(user.id));
    db.ratings = db.ratings.filter((rating) => !ids.has(rating.userId));
    db.bookmarks = db.bookmarks.filter((bookmark) => !ids.has(bookmark.userId));
    db.follows = db.follows.filter((follow) => !ids.has(follow.userId));
    changed = true;
  }

  // Retire the old virtual-demo settings block so every document is clean.
  if (db.settings && "demo" in (db.settings as unknown as Record<string, unknown>)) {
    delete (db.settings as unknown as Record<string, unknown>).demo;
    changed = true;
  }

  if (applyCatalogue(db)) changed = true;
  if (localizeContentToEnglish(db)) changed = true;
  if (backfillCommunity(db)) changed = true;
  // Last, so catalogue/ledger migrations cannot reintroduce generated reviews.
  if (stripFabricatedRatings(db)) changed = true;

  return changed;
}
