import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Small binary store for owner avatars. Kept out of the JSON document on
 * purpose: `db.json` is read on every request, so pictures must not live there.
 * Cloudflare Workers use the existing `FILES` R2 bucket; local dev uses
 * `data/blobs/`.
 */

const BLOB_DIR = path.join(process.cwd(), "data", "blobs");

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

function bucket(): R2BucketLike | null {
  try {
    const env = getCloudflareContext().env as Record<string, unknown> | undefined;
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
  const r2 = bucket();
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
  const r2 = bucket();
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
  const r2 = bucket();
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
