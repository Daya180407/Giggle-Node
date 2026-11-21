import type { DB, User } from "./types";

/**
 * Append-only admin audit trail. Kept inside the same document so a single
 * R2 compare-and-swap write covers both the change and its log entry.
 */
export function logAdminAction(
  db: DB,
  admin: User,
  action: string,
  target: string,
  detail = "",
): void {
  if (!Array.isArray(db.adminLog)) db.adminLog = [];
  db.adminLog.unshift({
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    userId: admin.id,
    userName: admin.name,
    action,
    target,
    detail: detail.slice(0, 240),
    at: new Date().toISOString(),
  });
  db.adminLog = db.adminLog.slice(0, 500);
}
