import { mutateDb } from "./store";

const MAX_TERMS = 200;
const MAX_LENGTH = 60;

/**
 * Aggregated public search log: one row per unique term with a running count.
 * Kept bounded so the JSON document stays small.
 */
export function recordSearch(term: string): void {
  const q = term.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_LENGTH);
  if (q.length < 2) return;

  mutateDb((db) => {
    const logs = db.searchLogs ?? (db.searchLogs = []);
    const at = new Date().toISOString();
    const row = logs.find((entry) => entry.q === q);
    if (row) {
      row.count += 1;
      row.lastAt = at;
    } else {
      logs.push({ q, count: 1, lastAt: at });
    }
    if (logs.length > MAX_TERMS) {
      db.searchLogs = [...logs].sort((a, b) => b.count - a.count).slice(0, MAX_TERMS);
    }
  });
}
