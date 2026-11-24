import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Small binary store for owner avatars. Kept out of the JSON document on
 * purpose: the database document is read on every request, so pictures must not
 * live there.
 * - Supabase Storage when SUPABASE_URL + service key are configured (Vercel).
 * - Cloudflare Workers use the existing `FILES` R2 bucket.
 * - Local dev uses `data/blobs/`.
 */

const BLOB_DIR = path.join(process.cwd(), "data", "blobs");
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "giglenode-media";

type R2ObjectLike = { arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } };
type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
};

function supabaseStorage(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function storageHeaders(config: { key: string }, extra: Record<string, string> = {}) {
  return { apikey: config.key, Authorization: `Bearer ${config.key}`, ...extra };
}

async function bucket(): Promise<R2BucketLike | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const env = (await mod.getCloudflareContext({ async: true })).env as Record<string, unknown> | undefined;
    const files = env?.FILES as R2BucketLike | undefined;
    return files && typeof files.put === "function" && typeof files.get === "function" ? files : null;
  } catch {
    return null;
  }
}

/** Keys are ours, but sanitise anyway so a crafted id cannot escape the folder. */
function localPath(key: string): string {
  const safe = key
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9/_.-]/g, "_")
    .replace(/^\/+/, "");
  return path.join(BLOB_DIR, safe);
}

export async function putAsset(key: string, bytes: Uint8Array, contentType: string): Promise<boolean> {
  const supabase = supabaseStorage();
  if (supabase) {
    try {
      const response = await fetch(`${supabase.url}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
        method: "POST",
        headers: storageHeaders(supabase, {
          "Content-Type": contentType,
          "Cache-Control": "max-age=31536000",
          "x-upsert": "true",
        }),
        body: bytes as unknown as BodyInit,
      });
      if (response.ok) return true;
    } catch {
      // fall through to R2 / local disk
    }
  }

  const r2 = await bucket();
  if (r2) {
    try {
      await r2.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
      return true;
    } catch {
      return false;
    }
  }
  try {
    const target = localPath(key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return true;
  } catch {
    return false;
  }
}

export async function getAsset(
  key: string,
  fallbackType = "application/octet-stream",
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const supabase = supabaseStorage();
  if (supabase) {
    try {
      const response = await fetch(`${supabase.url}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
        headers: storageHeaders(supabase),
        cache: "no-store",
      });
      if (response.ok) {
        return {
          body: await response.arrayBuffer(),
          contentType: response.headers.get("content-type") ?? fallbackType,
        };
      }
    } catch {
      // fall through to R2 / local disk
    }
  }

  const r2 = await bucket();
  if (r2) {
    try {
      const object = await r2.get(key);
      if (!object) return null;
      return { body: await object.arrayBuffer(), contentType: object.httpMetadata?.contentType ?? fallbackType };
    } catch {
      return null;
    }
  }
  try {
    const target = localPath(key);
    const buffer = fs.readFileSync(target);
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    return { body, contentType: fallbackType };
  } catch {
    return null;
  }
}

export async function deleteAsset(key: string): Promise<void> {
  const supabase = supabaseStorage();
  if (supabase) {
    try {
      const response = await fetch(`${supabase.url}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
        method: "DELETE",
        headers: storageHeaders(supabase),
      });
      if (response.ok) return;
    } catch {
      // fall through to R2 / local disk
    }
  }

  const r2 = await bucket();
  if (r2) {
    try {
      await r2.delete(key);
      return;
    } catch {
      return;
    }
  }
  try {
    fs.rmSync(localPath(key), { force: true });
  } catch {
    // Nothing to clean up.
  }
}
