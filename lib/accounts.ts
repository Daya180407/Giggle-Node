import { applyCatalogue } from "./catalogue/apply";
import { DEMO_ACCOUNTS } from "./demo-accounts";
import { localizeContentToEnglish } from "./localize-en";
import type { DB } from "./types";

/**
 * Backfills fields introduced after the first data snapshot (older R2 documents)
 * and gives the seeded demo accounts a password hash exactly once.
 * Deliberately synchronous work only: this runs during Worker startup.
 */
export async function migrateDb(db: DB): Promise<boolean> {
  let changed = false;

  if (!Array.isArray(db.authEvents)) {
    db.authEvents = [];
    changed = true;
  }

  for (const account of DEMO_ACCOUNTS) {
    const user = db.users.find((u) => u.email.toLowerCase() === account.email);
    if (!user) continue;
    // 150k-iteration hashes were written by an early build and cannot be verified on Workers.
    const legacyUnsupported = user.passwordHash?.startsWith("pbkdf2$150000$");
    if (!user.passwordHash || legacyUnsupported) {
      user.passwordHash = account.passwordHash;
      changed = true;
    }
  }

  if (applyCatalogue(db)) changed = true;
  if (localizeContentToEnglish(db)) changed = true;

  return changed;
}
