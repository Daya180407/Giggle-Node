import { recordPriceSnapshot } from "./community";
import { uid } from "./store";
import type {
  Ai,
  AiOwner,
  DB,
  Model,
  OwnerAccount,
  OwnerChange,
  OwnerChangeKind,
  Post,
  SubscriptionPlan,
} from "./types";

/**
 * Owner helpers: domain verification, ownership grants and the before/after
 * audit that makes every owner edit reversible by an admin.
 *
 * Owner accounts live apart from `db.users` and are only created by an admin
 * after the company mailed the proof code from its official domain.
 */

/** Free mailbox providers can never prove a company domain. */
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "aol.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "qq.com",
  "163.com",
  "126.com",
  "rediffmail.com",
]);

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const PROOF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PRICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/* ------------------------------- domains ------------------------------- */

/**
 * Accepts a bare domain, a URL or an email address and returns the bare host,
 * or null when it cannot prove ownership (free mail, a single label, garbage).
 */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^https?:\/\//, "").replace(/^\/\//, "");
  value = value.split("/")[0].split("?")[0].split("#")[0];
  if (value.includes("@")) value = value.slice(value.lastIndexOf("@") + 1);
  value = value.replace(/^www\./, "").replace(/\.$/, "").replace(/:\d+$/, "");
  if (!value || value.length > 120 || !DOMAIN_RE.test(value)) return null;
  if (value.split(".").length < 2) return null;
  if (FREE_MAIL_DOMAINS.has(value)) return null;
  return value;
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  return normalizeDomain(email.slice(at + 1));
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.trim().toLowerCase());
}

/** Domains accepted for a listing: admin aliases first, else the listing website. */
export function domainsForAi(ai: Ai): string[] {
  const explicit = (ai.ownerDomains ?? []).map(normalizeDomain).filter((d): d is string => Boolean(d));
  if (explicit.length) return [...new Set(explicit)];
  const fallback = normalizeDomain(ai.website);
  return fallback ? [fallback] : [];
}

export function emailMatchesAi(ai: Ai, email: string): boolean {
  const domain = emailDomain(email);
  return Boolean(domain && domainsForAi(ai).includes(domain));
}

export function proofCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((byte) => PROOF_ALPHABET[byte % PROOF_ALPHABET.length]);
  return `GN-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export const OWNER_PROOF_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function pendingRequestFor(db: DB, aiId: string, email: string) {
  const wanted = email.trim().toLowerCase();
  return (db.ownerRequests ?? []).find(
    (row) => row.aiId === aiId && row.status === "pending" && row.email.toLowerCase() === wanted,
  );
}

/* ------------------------------- accounts ------------------------------ */

export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

export function usernameTaken(db: DB, username: string, ignoreId?: string): boolean {
  const wanted = normalizeUsername(username);
  return (db.ownerAccounts ?? []).some((row) => row.id !== ignoreId && row.username === wanted);
}

export function ownerById(db: DB, id: string): OwnerAccount | null {
  return (db.ownerAccounts ?? []).find((row) => row.id === id) ?? null;
}

export function ownerByUsername(db: DB, username: string): OwnerAccount | null {
  const wanted = normalizeUsername(username);
  if (!wanted) return null;
  return (db.ownerAccounts ?? []).find((row) => row.username === wanted) ?? null;
}

export function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const text = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return text || "AI";
}

export function avatarSrc(owner: OwnerAccount): string {
  if (!owner.avatarKey) return "";
  return `/api/owner/avatar/${owner.id}?v=${owner.avatarVersion ?? 1}`;
}

/* ------------------------------ ownership ------------------------------ */

export function grantRowsFor(db: DB, ownerId: string): AiOwner[] {
  return (db.aiOwners ?? []).filter((row) => row.ownerId === ownerId);
}

export function aiIdsForOwner(db: DB, ownerId: string): string[] {
  return grantRowsFor(db, ownerId).map((row) => row.aiId);
}

export function ownsAi(db: DB, ownerId: string, aiId: string): boolean {
  return (db.aiOwners ?? []).some((row) => row.ownerId === ownerId && row.aiId === aiId);
}

export function ownersOfAi(db: DB, aiId: string): OwnerAccount[] {
  const ids = new Set((db.aiOwners ?? []).filter((row) => row.aiId === aiId).map((row) => row.ownerId));
  return (db.ownerAccounts ?? []).filter((row) => ids.has(row.id));
}

/** The verified owner shown as the public badge for a listing, if any. */
export function verifiedOwnerFor(db: DB, aiId: string): OwnerAccount | null {
  return ownersOfAi(db, aiId).find((row) => row.status === "active") ?? null;
}

/** An AI can have one owner login; granting a second is refused until revoked. */
export function aiAlreadyOwned(db: DB, aiId: string, exceptOwnerId?: string): OwnerAccount | null {
  return ownersOfAi(db, aiId).find((row) => row.id !== exceptOwnerId) ?? null;
}

/* ------------------------------ changes -------------------------------- */

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export type OwnerPriceSnapshot = { planPrice: number; planPriceInr: number };

function applyKind(db: DB, change: OwnerChange, snapshot: unknown): boolean {
  const kind = change.kind as OwnerChangeKind;

  if (kind === "plans") {
    const ai = db.ai.find((row) => row.id === change.aiId);
    if (!ai) return false;
    ai.plans = clone((snapshot as SubscriptionPlan[]) ?? []);
    return true;
  }

  if (kind === "price") {
    const ai = db.ai.find((row) => row.id === change.aiId);
    if (!ai) return false;
    const price = (snapshot as OwnerPriceSnapshot | null) ?? { planPrice: 0, planPriceInr: 0 };
    ai.planPrice = Number(price.planPrice) || 0;
    ai.planPriceInr = Number(price.planPriceInr) || 0;
    return true;
  }

  if (kind === "model") {
    const model = snapshot as Model | null;
    if (!model) {
      // Reverting a freshly added model removes it (and the votes it collected).
      db.models = db.models.filter((row) => row.id !== change.targetId);
      db.ratings = db.ratings.filter((row) => row.modelId !== change.targetId);
      return true;
    }
    const index = db.models.findIndex((row) => row.id === model.id);
    if (index >= 0) db.models[index] = clone(model);
    else db.models.push(clone(model));
    return true;
  }

  if (kind === "post") {
    const post = snapshot as Post | null;
    if (!post) {
      db.posts = db.posts.filter((row) => row.id !== change.targetId);
      return true;
    }
    const index = db.posts.findIndex((row) => row.id === post.id);
    if (index >= 0) db.posts[index] = clone(post);
    else db.posts.push(clone(post));
    return true;
  }

  return false;
}

/** Writes the change into the live catalogue (or restores the snapshot on revert). */
export function applyOwnerChange(db: DB, change: OwnerChange): boolean {
  const applied = applyKind(db, change, change.after);
  if (!applied) return false;
  if (change.kind === "price") {
    const ai = db.ai.find((row) => row.id === change.aiId);
    if (ai) recordPriceSnapshot(db, ai);
  }
  return true;
}

export function revertOwnerChange(db: DB, change: OwnerChange): boolean {
  const reverted = applyKind(db, change, change.before);
  if (!reverted) return false;
  if (change.kind === "price") {
    const ai = db.ai.find((row) => row.id === change.aiId);
    if (ai) recordPriceSnapshot(db, ai);
  }
  return true;
}

export type OwnerChangeInput = {
  ai: Ai;
  kind: OwnerChangeKind;
  targetId: string;
  title: string;
  summary: string;
  before: unknown;
  after: unknown;
  sourceUrl?: string;
};

export const MAX_OWNER_CHANGES = 600;

/**
 * Records the audit row and applies it immediately for trusted owners.
 * Review-tier owners leave a pending row for the admin to approve.
 */
export function recordOwnerChange(db: DB, owner: OwnerAccount, input: OwnerChangeInput): OwnerChange {
  if (!Array.isArray(db.ownerChanges)) db.ownerChanges = [];
  const change: OwnerChange = {
    id: uid("ochg"),
    ownerId: owner.id,
    ownerName: owner.displayName,
    aiId: input.ai.id,
    aiName: input.ai.name,
    kind: input.kind,
    targetId: input.targetId,
    title: input.title.slice(0, 120),
    summary: input.summary.slice(0, 300),
    before: clone(input.before),
    after: clone(input.after),
    status: owner.tier === "live" ? "applied" : "pending",
    sourceUrl: input.sourceUrl?.slice(0, 300),
    createdAt: new Date().toISOString(),
    reviewedAt: owner.tier === "live" ? new Date().toISOString() : null,
    reviewedBy: owner.tier === "live" ? owner.displayName : null,
  };
  if (change.status === "applied") applyOwnerChange(db, change);
  db.ownerChanges.unshift(change);
  db.ownerChanges = db.ownerChanges.slice(0, MAX_OWNER_CHANGES);
  return change;
}

/** One price edit per target per 24 hours, measured from the audit trail. */
export function priceChangeWindow(db: DB, targetId: string): { allowed: boolean; lastAt: string | null } {
  const cutoff = Date.now() - PRICE_WINDOW_MS;
  const recent = (db.ownerChanges ?? [])
    .filter(
      (row) =>
        row.targetId === targetId &&
        (row.kind === "price" || row.kind === "model") &&
        (row.status === "applied" || row.status === "pending") &&
        +new Date(row.createdAt) > cutoff,
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  return { allowed: !recent, lastAt: recent?.createdAt ?? null };
}

export function ownerChangesFor(db: DB, ownerId: string, filter?: "pending" | "applied" | "all"): OwnerChange[] {
  return (db.ownerChanges ?? [])
    .filter((row) => row.ownerId === ownerId && !row.deletedAt)
    .filter((row) => {
      if (filter === "pending") return row.status === "pending";
      if (filter === "applied") return row.status === "applied";
      return true;
    });
}

/** Pending drafts are capped so an owner cannot flood the post table. */
export const MAX_OWNER_DRAFTS = 3;

export function ownerDrafts(db: DB, ownerId: string): Post[] {
  return db.posts
    .filter((row) => row.ownerId === ownerId && row.status === "draft")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export function ownerPostCount(db: DB, ownerId: string): number {
  return db.posts.filter((row) => row.ownerId === ownerId).length;
}

/** Proof codes expire so an old request cannot be reused weeks later. */
export function proofCodeExpired(createdAt: string): boolean {
  return Date.now() - +new Date(createdAt) > OWNER_PROOF_TTL_MS;
}

/** Hours a price edit must still wait before the 24h window opens. */
export function priceWaitHours(lastAt: string | null): number {
  if (!lastAt) return 0;
  const remaining = PRICE_WINDOW_MS - (Date.now() - +new Date(lastAt));
  return Math.max(0, Math.ceil(remaining / 3600000));
}

export function listOwnerRequests(db: DB, status?: "pending" | "verified" | "rejected") {
  return (db.ownerRequests ?? [])
    .filter((row) => (status ? row.status === status : true))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
