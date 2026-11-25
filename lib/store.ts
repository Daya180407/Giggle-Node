import "server-only";
import fs from "node:fs";
import path from "node:path";
import { migrateDb } from "./accounts";
import { buildSeed } from "./seed";
import type { DB } from "./types";

/**
 * Data layer.
 * - Local Node dev: `data/db.json` (read + write).
 * - Cloudflare Workers: one JSON document in the `FILES` R2 bucket.
 * - Vercel / any Node host: one JSON document in Supabase (`gigglenode_state`).
 * - Last resort: an in-memory seed (no persistence).
 *
 * Concurrent safety: every remote write uses compare-and-swap (R2 object ETag,
 * Supabase `version` column). When another instance wrote first, the pending
 * mutations are replayed on top of the fresh document and the write is retried,
 * so two simultaneous ratings cannot overwrite each other.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const R2_KEY = "gigglenode/db.json";
// Documents written before the brand spelling fix live under the old key; read them once
// so the rename never resets live data.
const LEGACY_R2_KEY = "giglenode/db.json";
const MAX_CAS_ATTEMPTS = 5;

const SUPABASE_TABLE = "gigglenode_state";
const SUPABASE_ROW = "main";

type Runtime = "fs" | "r2" | "supabase" | "memory";
type Mutator = (db: DB) => void;

type R2ObjectLike = { text(): Promise<string>; etag?: string };
type R2Like = {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string }; onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string } },
  ): Promise<R2ObjectLike | null>;
};

const g = globalThis as typeof globalThis & {
  __gigglenodeDb?: DB;
  __gigglenodeRuntime?: Runtime;
  __gigglenodeEtag?: string | null;
  __gigglenodeVersion?: string | null;
  __gigglenodePending?: Mutator[];
  __gigglenodeFlushing?: boolean;
  __gigglenodeFlush?: Promise<void> | null;
  __gigglenodeBootError?: string | null;
  __gigglenodeSyncedAt?: number;
  __gigglenodeMtime?: number;
  __gigglenodeSupabaseFailed?: boolean;
};

/* ------------------------------ node fs ------------------------------ */

function readNodeDb(): DB | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
    return parsed?.ai && parsed?.ratings ? parsed : null;
  } catch {
    return null;
  }
}

function nodeDbMtime(): number {
  try {
    return fs.statSync(DB_FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function writeNodeDb(db: DB): boolean {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
    g.__gigglenodeMtime = nodeDbMtime();
    return true;
  } catch {
    return false;
  }
}

/* ----------------------------- supabase ------------------------------ */

type SupabaseConfig = { url: string; key: string };

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function supabaseHeaders(config: SupabaseConfig, extra: Record<string, string> = {}) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    Accept: "application/json",
    ...extra,
  };
}

type RemoteRead = { ok: boolean; found: boolean; db: DB | null; token: string | null };

async function supabaseRead(): Promise<RemoteRead> {
  const config = supabaseConfig();
  if (!config) return { ok: false, found: false, db: null, token: null };
  try {
    const response = await fetch(
      `${config.url}/rest/v1/${SUPABASE_TABLE}?id=eq.${SUPABASE_ROW}&select=doc,version`,
      { headers: supabaseHeaders(config), cache: "no-store" },
    );
    if (!response.ok) return { ok: false, found: false, db: null, token: null };
    const rows = (await response.json()) as { doc?: DB; version?: number }[];
    const row = rows[0];
    if (!row?.doc?.ai || !row.doc.ratings) return { ok: true, found: false, db: null, token: null };
    return { ok: true, found: true, db: row.doc, token: String(row.version ?? 0) };
  } catch {
    return { ok: false, found: false, db: null, token: null };
  }
}

type WriteResult = { token: string } | "conflict" | "error";

async function supabaseWrite(db: DB, token: string | null): Promise<WriteResult> {
  const config = supabaseConfig();
  if (!config) return "error";
  const nextVersion = Number(token ?? 0) + 1;
  const body = JSON.stringify({ doc: db, version: nextVersion, updated_at: new Date().toISOString() });
  try {
    if (token) {
      const response = await fetch(
        `${config.url}/rest/v1/${SUPABASE_TABLE}?id=eq.${SUPABASE_ROW}&version=eq.${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: supabaseHeaders(config, { "Content-Type": "application/json", Prefer: "return=representation" }),
          body,
        },
      );
      if (response.status === 409) return "conflict";
      if (!response.ok) return "error";
      const rows = (await response.json()) as { version?: number }[];
      if (rows.length === 0) return "conflict";
      return { token: String(rows[0]?.version ?? nextVersion) };
    }

    const response = await fetch(`${config.url}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: supabaseHeaders(config, {
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=ignore-duplicates",
      }),
      body: JSON.stringify({ id: SUPABASE_ROW, doc: db, version: 1, updated_at: new Date().toISOString() }),
    });
    if (response.status === 409) return "conflict";
    if (!response.ok) return "error";
    const rows = (await response.json()) as { version?: number }[];
    if (rows.length === 0) return "conflict";
    return { token: String(rows[0]?.version ?? 1) };
  } catch {
    return "error";
  }
}

/* -------------------------------- r2 --------------------------------- */

async function cloudflareEnv(): Promise<Record<string, unknown> | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    return (env ?? null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function r2FromEnv(env: Record<string, unknown> | null): R2Like | null {
  const bucket = env?.FILES as R2Like | undefined;
  return bucket && typeof bucket.get === "function" && typeof bucket.put === "function" ? bucket : null;
}

async function r2Bucket(): Promise<R2Like | null> {
  return r2FromEnv(await cloudflareEnv());
}

async function r2Read(bucket: R2Like): Promise<RemoteRead> {
  try {
    const current = await bucket.get(R2_KEY);
    const object = current ?? (await bucket.get(LEGACY_R2_KEY));
    if (!object) return { ok: true, found: false, db: null, token: null };
    // A legacy object's ETag belongs to another key, so the first write must create R2_KEY.
    const token = current ? object.etag ?? null : null;
    const parsed = JSON.parse(await object.text()) as DB;
    if (!parsed?.ai || !parsed?.ratings) return { ok: true, found: false, db: null, token };
    return { ok: true, found: true, db: parsed, token };
  } catch {
    return { ok: false, found: false, db: null, token: null };
  }
}

async function r2Write(bucket: R2Like, db: DB, token: string | null): Promise<WriteResult> {
  try {
    const object = await bucket.put(R2_KEY, JSON.stringify(db), {
      httpMetadata: { contentType: "application/json" },
      onlyIf: token ? { etagMatches: token } : { etagDoesNotMatch: "*" },
    });
    return object ? { token: object.etag ?? "" } : "conflict";
  } catch {
    return "error";
  }
}

/* ----------------------------- bootstrap ----------------------------- */

async function bootstrap(): Promise<void> {
  if (g.__gigglenodeDb) return;

  const nodeDb = readNodeDb();
  if (nodeDb) {
    g.__gigglenodeDb = nodeDb;
    g.__gigglenodeRuntime = "fs";
    g.__gigglenodeMtime = nodeDbMtime();
    if (await migrateDb(nodeDb)) writeNodeDb(nodeDb);
    return;
  }

  // Supabase first: a Vercel deployment has a read-only filesystem and no R2.
  if (supabaseConfig()) {
    const remote = await supabaseRead();
    if (remote.ok) {
      if (remote.found && remote.db) {
        g.__gigglenodeDb = remote.db;
        g.__gigglenodeRuntime = "supabase";
        g.__gigglenodeVersion = remote.token;
        g.__gigglenodeSyncedAt = Date.now();
        if ((await migrateDb(remote.db)) && (await supabaseWrite(remote.db, remote.token)) !== "error") {
          const again = await supabaseRead();
          g.__gigglenodeVersion = again.token;
        }
        return;
      }

      const seed = buildSeed();
      await migrateDb(seed);
      g.__gigglenodeDb = seed;
      g.__gigglenodeRuntime = "supabase";
      const created = await supabaseWrite(seed, null);
      if (created === "conflict") {
        const retry = await supabaseRead();
        if (retry.found && retry.db) {
          g.__gigglenodeDb = retry.db;
          g.__gigglenodeVersion = retry.token;
          return;
        }
      } else if (created !== "error") {
        g.__gigglenodeVersion = created.token;
      }
      return;
    }
    g.__gigglenodeSupabaseFailed = true;
  }

  const bucket = await r2Bucket();
  if (bucket) {
    const cloud = await r2Read(bucket);
    if (cloud.found && cloud.db) {
      g.__gigglenodeDb = cloud.db;
      g.__gigglenodeRuntime = "r2";
      g.__gigglenodeEtag = cloud.token;
      g.__gigglenodeSyncedAt = Date.now();
      if (await migrateDb(cloud.db)) {
        const result = await r2Write(bucket, cloud.db, cloud.token);
        if (result !== "error" && result !== "conflict") g.__gigglenodeEtag = result.token;
      }
      return;
    }

    if (cloud.ok) {
      const seed = buildSeed();
      await migrateDb(seed);
      g.__gigglenodeDb = seed;
      g.__gigglenodeRuntime = "r2";
      const result = await r2Write(bucket, seed, null);
      if (result === "error" || result === "conflict") {
        const retry = await r2Read(bucket);
        if (retry.found && retry.db) {
          g.__gigglenodeDb = retry.db;
          g.__gigglenodeEtag = retry.token;
          return;
        }
      } else {
        g.__gigglenodeEtag = result.token;
      }
      return;
    }
  }

  const seed = buildSeed();
  await migrateDb(seed);
  g.__gigglenodeDb = seed;

  if (writeNodeDb(seed)) {
    g.__gigglenodeRuntime = "fs";
  } else {
    g.__gigglenodeRuntime = "memory";
  }
}

// Top-level await so the synchronous readDb() below always has hydrated data.
// A startup failure must never take the whole site down: fall back to an in-memory seed.
try {
  await bootstrap();
  g.__gigglenodeBootError = g.__gigglenodeSupabaseFailed
    ? "Supabase is configured but the gigglenode_state table could not be read."
    : null;
} catch (error) {
  g.__gigglenodeBootError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (!g.__gigglenodeDb) {
    g.__gigglenodeDb = buildSeed();
    g.__gigglenodeRuntime = "memory";
  }
}

/* ------------------------------- writes ------------------------------ */

function pendingMutators(): Mutator[] {
  if (!g.__gigglenodePending) g.__gigglenodePending = [];
  return g.__gigglenodePending;
}

async function readRemote(): Promise<RemoteRead> {
  if (g.__gigglenodeRuntime === "supabase") return supabaseRead();
  if (g.__gigglenodeRuntime === "r2") {
    const bucket = await r2Bucket();
    return bucket ? r2Read(bucket) : { ok: false, found: false, db: null, token: null };
  }
  return { ok: false, found: false, db: null, token: null };
}

async function writeRemote(db: DB, token: string | null): Promise<WriteResult> {
  if (g.__gigglenodeRuntime === "supabase") return supabaseWrite(db, token);
  if (g.__gigglenodeRuntime === "r2") {
    const bucket = await r2Bucket();
    return bucket ? r2Write(bucket, db, token) : "error";
  }
  return "error";
}

async function writePending(): Promise<void> {
  if (g.__gigglenodeRuntime !== "supabase" && g.__gigglenodeRuntime !== "r2") return;

  const pending = pendingMutators();
  while (pending.length > 0) {
    const batch = pending.slice();
    let written = false;

    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS && !written; attempt++) {
      const token = g.__gigglenodeRuntime === "supabase" ? g.__gigglenodeVersion ?? null : g.__gigglenodeEtag ?? null;
      const result = await writeRemote(readDb(), token);

      if (result !== "conflict" && result !== "error") {
        if (g.__gigglenodeRuntime === "supabase") g.__gigglenodeVersion = result.token;
        else g.__gigglenodeEtag = result.token;
        pending.splice(0, batch.length);
        written = true;
        break;
      }
      if (result === "error") return; // keep mutations pending for the next write

      // Another instance wrote first: replay our mutations on top of the latest document.
      const remote = await readRemote();
      if (!remote.found || !remote.db) return;

      const fresh = remote.db;
      for (const mutate of batch) {
        try {
          mutate(fresh);
        } catch {
          // A mutation referring to data removed by the other writer is dropped.
        }
      }
      Object.assign(readDb(), fresh);
      if (g.__gigglenodeRuntime === "supabase") g.__gigglenodeVersion = remote.token;
      else g.__gigglenodeEtag = remote.token;
      await new Promise((resolve) => setTimeout(resolve, 25 + attempt * 40));
    }

    if (!written) return; // give up for now; retried on the next mutation
  }
}

/**
 * Flushes queued mutations to the remote document. When a flush is already running
 * this waits for it to finish instead of returning early, so a caller that awaits a
 * durable write (auth, claims, admin saves) never redirects to a page whose next
 * request reads the pre-write document.
 */
async function flushCloud(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    if (!g.__gigglenodeFlushing) {
      if (g.__gigglenodeRuntime !== "supabase" && g.__gigglenodeRuntime !== "r2") return;
      g.__gigglenodeFlushing = true;
      const run = writePending();
      g.__gigglenodeFlush = run;
      try {
        await run;
      } catch {
        // Keep the mutations queued; the next mutation or request retries them.
      } finally {
        g.__gigglenodeFlushing = false;
        g.__gigglenodeFlush = null;
      }
      return;
    }

    const running = g.__gigglenodeFlush;
    if (running) {
      try {
        await running;
      } catch {
        // The running flush records its own failures; the caller keeps going.
      }
    }
    if (pendingMutators().length === 0) return;
    // The running flush gave up with our mutations still queued: try writing them now.
  }
}

function scheduleFlush() {
  const run = flushCloud().catch(() => {});
  // Cloudflare can extend the request lifetime; other hosts just let it finish in-process.
  void (async () => {
    try {
      const mod = await import("@opennextjs/cloudflare");
      mod.getCloudflareContext().ctx.waitUntil(run);
    } catch {
      void run;
    }
  })();
}

/* -------------------------------- api -------------------------------- */

export function readDb(): DB {
  // Production can serve requests from more than one instance. Pick up a document
  // written by another instance so admin saves and public submissions are visible
  // on the very next request instead of only after a restart.
  if (g.__gigglenodeRuntime === "fs" && g.__gigglenodeMtime) {
    const mtime = nodeDbMtime();
    if (mtime && mtime !== g.__gigglenodeMtime) {
      const fresh = readNodeDb();
      if (fresh) {
        Object.assign(g.__gigglenodeDb!, fresh);
        g.__gigglenodeMtime = mtime;
      }
    }
  }
  return g.__gigglenodeDb!;
}

/**
 * Waits for queued mutations to reach the remote document. Auth actions await this before
 * redirecting so an immediate login on another instance always sees the account change.
 */
export async function flushPendingWrites(): Promise<void> {
  if (g.__gigglenodeRuntime !== "supabase" && g.__gigglenodeRuntime !== "r2") return;
  if (pendingMutators().length === 0) return;
  await flushCloud();
}

/**
 * Pulls the document from the remote store so this instance sees writes made by others.
 * Pass `maxAgeMs` to skip the read when the snapshot was refreshed recently.
 * Used by auth (login must see a user created elsewhere) and to bound how stale a
 * logged-in header can look right after signup.
 */
export async function refreshDb(maxAgeMs?: number): Promise<DB> {
  if (g.__gigglenodeRuntime === "supabase" || g.__gigglenodeRuntime === "r2") {
    if (!g.__gigglenodeDb) return buildSeed();
    if (maxAgeMs !== undefined && g.__gigglenodeSyncedAt && Date.now() - g.__gigglenodeSyncedAt < maxAgeMs) {
      return g.__gigglenodeDb;
    }
    // Never refresh away writes that have not reached the remote document yet.
    if (pendingMutators().length > 0) await flushCloud();
    if (pendingMutators().length > 0) {
      g.__gigglenodeSyncedAt = Date.now();
      return g.__gigglenodeDb;
    }

    const remote = await readRemote();
    if (remote.found && remote.db) {
      Object.assign(g.__gigglenodeDb, remote.db);
      if (g.__gigglenodeRuntime === "supabase") g.__gigglenodeVersion = remote.token;
      else g.__gigglenodeEtag = remote.token;
    }
    g.__gigglenodeSyncedAt = Date.now();
    return g.__gigglenodeDb;
  }
  return g.__gigglenodeDb ?? buildSeed();
}

export function mutateDb<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);

  if (g.__gigglenodeRuntime === "fs") {
    writeNodeDb(db);
    return result;
  }
  if (g.__gigglenodeRuntime === "supabase" || g.__gigglenodeRuntime === "r2") {
    pendingMutators().push((draft) => {
      fn(draft);
    });
    scheduleFlush();
  }
  return result;
}

export function resetDb() {
  g.__gigglenodeDb = buildSeed();
  if (g.__gigglenodeRuntime === "fs") writeNodeDb(g.__gigglenodeDb);
  else if (g.__gigglenodeRuntime === "supabase" || g.__gigglenodeRuntime === "r2") scheduleFlush();
}

export function storageRuntime(): Runtime {
  return g.__gigglenodeRuntime ?? "memory";
}

export function bootstrapDiagnostics() {
  return {
    runtime: storageRuntime(),
    bootError: g.__gigglenodeBootError ?? null,
    etag: g.__gigglenodeEtag ?? null,
    version: g.__gigglenodeVersion ?? null,
    pendingWrites: pendingMutators().length,
  };
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
