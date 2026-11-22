import "server-only";
import type { SecuritySettings } from "./types";

/** Search IPs are hashed with a fixed app salt, never stored raw. */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|giglenode-search-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function findBadWord(text: string, words: string[]): string | null {
  if (!words.length) return null;
  const lower = text.toLowerCase();
  return words.find((word) => {
    const clean = word.trim().toLowerCase();
    return clean.length > 1 && lower.includes(clean);
  }) ?? null;
}

export function isBlockedIp(settings: SecuritySettings, ip: string, ratingsIn24h = 0): boolean {
  if (settings.blockedIps.includes(ip)) return true;
  return settings.ipBlockEnabled && ratingsIn24h >= Math.max(1, settings.ipRatingThreshold);
}

export function normalizeIpList(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const parts = value
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    for (const part of parts) {
      // IPv4 / IPv6-ish only; keeps typos out of the block list.
      if (/^[0-9a-fA-F:.]{7,45}$/.test(part)) seen.add(part);
    }
  }
  return [...seen].slice(0, 200);
}

export function normalizeWordList(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    for (const word of value.split(/[\n,]+/)) {
      const clean = word.trim().toLowerCase().slice(0, 40);
      if (clean.length > 1) seen.add(clean);
    }
  }
  return [...seen].slice(0, 300);
}
