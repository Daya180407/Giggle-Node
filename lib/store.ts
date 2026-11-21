import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildSeed } from "./seed";
import type { DB } from "./types";

/**
 * Data layer.
 * - Local Node dev: `data/db.json` (read + write).
 * - Cloudflare Workers: JSON document in the `FILES` R2 bucket, hydrated once per isolate.
 * Both use the same synchronous API so server components stay simple.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const R2_KEY = "giglenode/db.json";

type Runtime = "fs" | "r2" | "memory";

type R2Like = {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
};

const g = globalThis as typeof globalThis & {
  __giglenodeDb?: DB;
  __giglenodeRuntime?: Runtime;
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

async function loadCloud(): Promise<{ db: DB | null; bucket: R2Like | null }> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bucket = r2FromEnv(env);
    if (!bucket) return { db: null, bucket: null };
    const object = await bucket.get(R2_KEY);
    if (!object) return { db: null, bucket };
    const parsed = JSON.parse(await object.text()) as DB;
    if (!parsed?.ai || !parsed?.ratings) return { db: null, bucket };
    return { db: parsed, bucket };
  } catch {
    return { db: null, bucket: null };
  }
}

async function writeR2(bucket: R2Like, db: DB): Promise<void> {
  try {
    await bucket.put(R2_KEY, JSON.stringify(db), { httpMetadata: { contentType: "application/json" } });
  } catch {
    // Storage unavailable: keep serving the in-memory copy.
  }
}

/* ----------------------------- bootstrap ----------------------------- */

async function bootstrap(): Promise<void> {
  if (g.__giglenodeDb) return;

  const nodeDb = readNodeDb();
  if (nodeDb) {
    g.__giglenodeDb = nodeDb;
    g.__giglenodeRuntime = "fs";
    return;
  }

  const { db, bucket } = await loadCloud();
  if (db) {
    g.__giglenodeDb = db;
    g.__giglenodeRuntime = "r2";
    return;
  }

  const seed = buildSeed();
  g.__giglenodeDb = seed;
  if (bucket) {
    g.__giglenodeRuntime = "r2";
    await writeR2(bucket, seed);
  } else if (writeNodeDb(seed)) {
    g.__giglenodeRuntime = "fs";
  } else {
    g.__giglenodeRuntime = "memory";
  }
}

// Top-level await so the synchronous readDb() below always has hydrated data.
await bootstrap();

/* ------------------------------- api -------------------------------- */

function persist(db: DB) {
  const runtime = g.__giglenodeRuntime;
  if (runtime === "fs") {
    writeNodeDb(db);
    return;
  }
  if (runtime !== "r2") return;

  const bucket = r2Bucket();
  if (!bucket) return;
  const put = writeR2(bucket, db);
  try {
    getCloudflareContext().ctx.waitUntil(put);
  } catch {
    void put;
  }
}

export function readDb(): DB {
  return g.__giglenodeDb!;
}

export function mutateDb<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);
  persist(db);
  return result;
}

export function resetDb() {
  g.__giglenodeDb = buildSeed();
  persist(g.__giglenodeDb);
}

export function storageRuntime(): Runtime {
  return g.__giglenodeRuntime ?? "memory";
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
