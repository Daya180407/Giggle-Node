import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { migrateDb } from "./accounts";
import { buildSeed } from "./seed";
import type { DB } from "./types";

/**
 * Data layer.
 * - Local Node dev: `data/db.json` (read + write).
 * - Cloudflare Workers: one JSON document in the `FILES` R2 bucket.
 *
 * Concurrent safety: R2 writes use compare-and-swap on the object ETag. When another
 * isolate wrote first, the pending mutations are replayed on top of the fresh document
 * and the write is retried, so two simultaneous ratings cannot overwrite each other.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const R2_KEY = "giglenode/db.json";
const MAX_CAS_ATTEMPTS = 5;

type Runtime = "fs" | "r2" | "memory";
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
  __giglenodePending?: Mutator[];
  __giglenodeFlushing?: boolean;
  __giglenodeBootError?: string | null;
  __giglenodeSyncedAt?: number;
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

function writeNodeDb(db: DB): boolean {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------- r2 --------------------------------- */

function r2FromEnv(env: unknown): R2Like | null {
  const bucket = (env as Record<string, unknown> | undefined)?.FILES as R2Like | undefined;
  return bucket && typeof bucket.get === "function" && typeof bucket.put === "function" ? bucket : null;
}

function r2Bucket(): R2Like | null {
  try {
    return r2FromEnv(getCloudflareContext().env);
  } catch {
    return null;
  }
}

async function loadCloud(): Promise<{ db: DB | null; bucket: R2Like | null; etag: string | null }> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bucket = r2FromEnv(env);
    if (!bucket) return { db: null, bucket: null, etag: null };
    const object = await bucket.get(R2_KEY);
    if (!object) return { db: null, bucket, etag: null };
    const parsed = JSON.parse(await object.text()) as DB;
    if (!parsed?.ai || !parsed?.ratings) return { db: null, bucket, etag: object.etag ?? null };
    return { db: parsed, bucket, etag: object.etag ?? null };
  } catch {
    return { db: null, bucket: null, etag: null };
  }
}

type PutResult = { object: R2ObjectLike } | "conflict" | "error";

async function putDoc(bucket: R2Like, db: DB, etag: string | null): Promise<PutResult> {
  try {
    const object = await bucket.put(R2_KEY, JSON.stringify(db), {
      httpMetadata: { contentType: "application/json" },
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
    });
    return object ? { object } : "conflict";
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
    if (await migrateDb(nodeDb)) writeNodeDb(nodeDb);
    return;
  }

  const cloud = await loadCloud();
  if (cloud.db) {
    g.__giglenodeDb = cloud.db;
    g.__giglenodeRuntime = "r2";
    g.__giglenodeEtag = cloud.etag;
    g.__giglenodeSyncedAt = Date.now();
    if ((await migrateDb(cloud.db)) && cloud.bucket) {
      const result = await putDoc(cloud.bucket, cloud.db, cloud.etag);
      if (result !== "error" && result !== "conflict") g.__giglenodeEtag = result.object.etag ?? null;
    }
    return;
  }

  const seed = buildSeed();
  await migrateDb(seed);
  g.__giglenodeDb = seed;

  if (cloud.bucket) {
    g.__giglenodeRuntime = "r2";
    const result = await putDoc(cloud.bucket, seed, null);
    if (result === "error" || result === "conflict") {
      // Someone else seeded first: adopt their document instead of clobbering it.
      const retry = await loadCloud();
      if (retry.db) {
        g.__giglenodeDb = retry.db;
        g.__giglenodeEtag = retry.etag;
        return;
      }
    } else {
      g.__giglenodeEtag = result.object.etag ?? null;
    }
    return;
  }

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
  g.__giglenodeBootError = null;
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

async function flushCloud(): Promise<void> {
  if (g.__giglenodeFlushing) return;
  const bucket = r2Bucket();
  if (!bucket) return;

  const pending = pendingMutators();
  g.__giglenodeFlushing = true;
  try {
    while (pending.length > 0) {
      const batch = pending.slice();
      let written = false;

      for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS && !written; attempt++) {
        const result = await putDoc(bucket, readDb(), g.__giglenodeEtag ?? null);

        if (result !== "conflict" && result !== "error") {
          g.__giglenodeEtag = result.object.etag ?? null;
          pending.splice(0, batch.length);
          written = true;
          break;
        }
        if (result === "error") return; // keep mutations pending for the next write

        // Another isolate wrote first: replay our mutations on top of the latest document.
        const remote = await bucket.get(R2_KEY);
        let fresh: DB | null = null;
        if (remote) {
          try {
            fresh = JSON.parse(await remote.text()) as DB;
          } catch {
            fresh = null;
          }
        }
        if (!fresh) return;

        for (const mutate of batch) {
          try {
            mutate(fresh);
          } catch {
            // A mutation referring to data removed by the other writer is dropped.
          }
        }
        Object.assign(readDb(), fresh);
        g.__giglenodeEtag = remote?.etag ?? null;
        await new Promise((resolve) => setTimeout(resolve, 25 + attempt * 40));
      }

      if (!written) return; // give up for now; retried on the next mutation
    }
  } finally {
    g.__giglenodeFlushing = false;
  }
}

function scheduleFlush() {
  const run = flushCloud();
  try {
    getCloudflareContext().ctx.waitUntil(run);
  } catch {
    void run;
  }
}

/* -------------------------------- api -------------------------------- */

export function readDb(): DB {
  return g.__giglenodeDb!;
}

/**
 * Waits for queued mutations to reach R2. Auth actions await this before redirecting so an
 * immediate login on another request/isolate always sees the account or password change.
 */
export async function flushPendingWrites(): Promise<void> {
  if (g.__giglenodeRuntime !== "r2") return;
  if (pendingMutators().length === 0) return;
  await flushCloud();
}

/**
 * Pulls the document from R2 so this isolate sees writes made by other isolates.
 * Pass `maxAgeMs` to skip the read when the snapshot was refreshed recently.
 * Used by auth (login must see a user created by another isolate) and to bound
 * how stale a logged-in header can look right after signup.
 */
export async function refreshDb(maxAgeMs?: number): Promise<DB> {
  if (g.__giglenodeRuntime !== "r2" || !g.__giglenodeDb) return g.__giglenodeDb ?? buildSeed();
  if (maxAgeMs !== undefined && g.__giglenodeSyncedAt && Date.now() - g.__giglenodeSyncedAt < maxAgeMs) {
    return g.__giglenodeDb;
  }
  // Never refresh away writes that have not reached R2 yet.
  if (pendingMutators().length > 0) await flushCloud();

  const bucket = r2Bucket();
  if (bucket) {
    try {
      const object = await bucket.get(R2_KEY);
      if (object) {
        const fresh = JSON.parse(await object.text()) as DB;
        if (fresh?.ai && fresh?.ratings) {
          Object.assign(g.__giglenodeDb, fresh);
          g.__giglenodeEtag = object.etag ?? null;
        }
      }
    } catch {
      // Keep the current snapshot if R2 is briefly unavailable.
    }
  }
  g.__giglenodeSyncedAt = Date.now();
  return g.__giglenodeDb;
}

export function mutateDb<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);

  if (g.__giglenodeRuntime === "fs") {
    writeNodeDb(db);
    return result;
  }
  if (g.__giglenodeRuntime === "r2") {
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
  else if (g.__giglenodeRuntime === "r2") scheduleFlush();
}

export function storageRuntime(): Runtime {
  return g.__giglenodeRuntime ?? "memory";
}

export function bootstrapDiagnostics() {
  return {
    runtime: storageRuntime(),
    bootError: g.__giglenodeBootError ?? null,
    etag: g.__giglenodeEtag ?? null,
    pendingWrites: pendingMutators().length,
  };
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
