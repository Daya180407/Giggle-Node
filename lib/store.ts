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
 * - Vercel / any Node host: one JSON document in Supabase (`giglenode_state`).
 * - Last resort: an in-memory seed (no persistence).
 *
 * Concurrent safety: every remote write uses compare-and-swap (R2 object ETag,
 * Supabase `version` column). When another instance wrote first, the pending
 * mutations are replayed on top of the fresh document and the write is retried,
 * so two simultaneous ratings cannot overwrite each other.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const R2_KEY = "giglenode/db.json";
const MAX_CAS_ATTEMPTS = 5;

const SUPABASE_TABLE = "giglenode_state";
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
  __giglenodeDb?: DB;
  __giglenodeRuntime?: Runtime;
  __giglenodeEtag?: string | null;
  __giglenodeVersion?: string | null;
  __giglenodePending?: Mutator[];
  __giglenodeFlushing?: boolean;
  __giglenodeFlush?: Promise<void> | null;
  __giglenodeBootError?: string | null;
  __giglenodeSyncedAt?: number;
  __giglenodeMtime?: number;
  __giglenodeSupabaseFailed?: boolean;
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
    g.__giglenodeMtime = nodeDbMtime();
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
    const object = await bucket.get(R2_KEY);
    if (!object) return { ok: true, found: false, db: null, token: null };
    const parsed = JSON.parse(await object.text()) as DB;
    if (!parsed?.ai || !parsed?.ratings) return { ok: true, found: false, db: null, token: object.etag ?? null };
    return { ok: true, found: true, db: parsed, token: object.etag ?? null };
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
  if (g.__giglenodeDb) return;

  const nodeDb = readNodeDb();
  if (nodeDb) {
    g.__giglenodeDb = nodeDb;
    g.__giglenodeRuntime = "fs";
    g.__giglenodeMtime = nodeDbMtime();
    if (await migrateDb(nodeDb)) writeNodeDb(nodeDb);
    return;
  }

  // Supabase first: a Vercel deployment has a read-only filesystem and no R2.
  if (supabaseConfig()) {
    const remote = await supabaseRead();
    if (remote.ok) {
      if (remote.found && remote.db) {
        g.__giglenodeDb = remote.db;
        g.__giglenodeRuntime = "supabase";
        g.__giglenodeVersion = remote.token;
        g.__giglenodeSyncedAt = Date.now();
        if ((await migrateDb(remote.db)) && (await supabaseWrite(remote.db, remote.token)) !== "error") {
          const again = await supabaseRead();
          g.__giglenodeVersion = again.token;
        }
        return;
      }

      const seed = buildSeed();
      await migrateDb(seed);
      g.__giglenodeDb = seed;
      g.__giglenodeRuntime = "supabase";
      const created = await supabaseWrite(seed, null);
      if (created === "conflict") {
        const retry = await supabaseRead();
        if (retry.found && retry.db) {
          g.__giglenodeDb = retry.db;
          g.__giglenodeVersion = retry.token;
          return;
        }
      } else if (created !== "error") {
        g.__giglenodeVersion = created.token;
      }
      return;
    }
    g.__giglenodeSupabaseFailed = true;
  }

  const bucket = await r2Bucket();
  if (bucket) {
    const cloud = await r2Read(bucket);
    if (cloud.found && cloud.db) {
      g.__giglenodeDb = cloud.db;
      g.__giglenodeRuntime = "r2";
      g.__giglenodeEtag = cloud.token;
      g.__giglenodeSyncedAt = Date.now();
      if (await migrateDb(cloud.db)) {
        const result = await r2Write(bucket, cloud.db, cloud.token);
        if (result !== "error" && result !== "conflict") g.__giglenodeEtag = result.token;
      }
      return;
    }

    if (cloud.ok) {
      const seed = buildSeed();
      await migrateDb(seed);
      g.__giglenodeDb = seed;
      g.__giglenodeRuntime = "r2";
      const result = await r2Write(bucket, seed, null);
      if (result === "error" || result === "conflict") {
        const retry = await r2Read(bucket);
        if (retry.found && retry.db) {
          g.__giglenodeDb = retry.db;
          g.__giglenodeEtag = retry.token;
          return;
        }
      } else {
        g.__giglenodeEtag = result.token;
      }
      return;
    }
  }

  const seed = buildSeed();
  await migrateDb(seed);
  g.__giglenodeDb = seed;

  if (writeNodeDb(seed)) {
    g.__giglenodeRuntime = "fs";
  } else {
    g.__giglenodeRuntime = "memory";
  }
}

// Top-level await so the synchronous readDb() below always has hydrated data.
// A startup failure must never take the whole site down: fall back to an in-memory seed.
try {
  await bootstrap();
  g.__giglenodeBootError = g.__giglenodeSupabaseFailed
    ? "Supabase is configured but the giglenode_state table could not be read."
    : null;
} catch (error) {
  g.__giglenodeBootError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (!g.__giglenodeDb) {
    g.__giglenodeDb = buildSeed();
    g.__giglenodeRuntime = "memory";
  }
}

/* ------------------------------- writes ------------------------------ */

function pendingMutators(): Mutator[] {
  if (!g.__giglenodePending) g.__giglenodePending = [];
  return g.__giglenodePending;
}

async function readRemote(): Promise<RemoteRead> {
  if (g.__giglenodeRuntime === "supabase") return supabaseRead();
  if (g.__giglenodeRuntime === "r2") {
    const bucket = await r2Bucket();
    return bucket ? r2Read(bucket) : { ok: false, found: false, db: null, token: null };
  }
  return { ok: false, found: false, db: null, token: null };
}

async function writeRemote(db: DB, token: string | null): Promise<WriteResult> {
  if (g.__giglenodeRuntime === "supabase") return supabaseWrite(db, token);
  if (g.__giglenodeRuntime === "r2") {
    const bucket = await r2Bucket();
    return bucket ? r2Write(bucket, db, token) : "error";
  }
  return "error";
}

async function writePending(): Promise<void> {
  if (g.__giglenodeRuntime !== "supabase" && g.__giglenodeRuntime !== "r2") return;

  const pending = pendingMutators();
  while (pending.length > 0) {
    const batch = pending.slice();
    let written = false;

    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS && !written; attempt++) {
      const token = g.__giglenodeRuntime === "supabase" ? g.__giglenodeVersion ?? null : g.__giglenodeEtag ?? null;
      const result = await writeRemote(readDb(), token);

      if (result !== "conflict" && result !== "error") {
        if (g.__giglenodeRuntime === "supabase") g.__giglenodeVersion = result.token;
        else g.__giglenodeEtag = result.token;
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
      if (g.__giglenodeRuntime === "supabase") g.__giglenodeVersion = remote.token;
      else g.__giglenodeEtag = remote.token;
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
    if (!g.__giglenodeFlushing) {
      if (g.__giglenodeRuntime !== "supabase" && g.__giglenodeRuntime !== "r2") return;
      g.__giglenodeFlushing = true;
      const run = writePending();
      g.__giglenodeFlush = run;
      try {
        await run;
      } catch {
        // Keep the mutations queued; the next mutation or request retries them.
      } finally {
        g.__giglenodeFlushing = false;
        g.__giglenodeFlush = null;
      }
      return;
    }

    const running = g.__giglenodeFlush;
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
  if (g.__giglenodeRuntime === "fs" && g.__giglenodeMtime) {
    const mtime = nodeDbMtime();
    if (mtime && mtime !== g.__giglenodeMtime) {
      const fresh = readNodeDb();
      if (fresh) {
        Object.assign(g.__giglenodeDb!, fresh);
        g.__giglenodeMtime = mtime;
      }
    }
  }
  return g.__giglenodeDb!;
}

/**
 * Waits for queued mutations to reach the remote document. Auth actions await this before
 * redirecting so an immediate login on another instance always sees the account change.
 */
export async function flushPendingWrites(): Promise<void> {
  if (g.__giglenodeRuntime !== "supabase" && g.__giglenodeRuntime !== "r2") return;
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
  if (g.__giglenodeRuntime === "supabase" || g.__giglenodeRuntime === "r2") {
    if (!g.__giglenodeDb) return buildSeed();
    if (maxAgeMs !== undefined && g.__giglenodeSyncedAt && Date.now() - g.__giglenodeSyncedAt < maxAgeMs) {
      return g.__giglenodeDb;
    }
    // Never refresh away writes that have not reached the remote document yet.
    if (pendingMutators().length > 0) await flushCloud();
    if (pendingMutators().length > 0) {
      g.__giglenodeSyncedAt = Date.now();
      return g.__giglenodeDb;
    }

    const remote = await readRemote();
    if (remote.found && remote.db) {
      Object.assign(g.__giglenodeDb, remote.db);
      if (g.__giglenodeRuntime === "supabase") g.__giglenodeVersion = remote.token;
      else g.__giglenodeEtag = remote.token;
    }
    g.__giglenodeSyncedAt = Date.now();
    return g.__giglenodeDb;
  }
  return g.__giglenodeDb ?? buildSeed();
}

export function mutateDb<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);

  if (g.__giglenodeRuntime === "fs") {
    writeNodeDb(db);
    return result;
  }
  if (g.__giglenodeRuntime === "supabase" || g.__giglenodeRuntime === "r2") {
    pendingMutators().push((draft) => {
      fn(draft);
    });
    scheduleFlush();
  }
  return result;
}

export function resetDb() {
  g.__giglenodeDb = buildSeed();
  if (g.__giglenodeRuntime === "fs") writeNodeDb(g.__giglenodeDb);
  else if (g.__giglenodeRuntime === "supabase" || g.__giglenodeRuntime === "r2") scheduleFlush();
}

export function storageRuntime(): Runtime {
  return g.__giglenodeRuntime ?? "memory";
}

export function bootstrapDiagnostics() {
  return {
    runtime: storageRuntime(),
    bootError: g.__giglenodeBootError ?? null,
    etag: g.__giglenodeEtag ?? null,
    version: g.__giglenodeVersion ?? null,
    pendingWrites: pendingMutators().length,
  };
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
