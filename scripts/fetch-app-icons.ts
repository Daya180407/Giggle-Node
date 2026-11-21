import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DESKTOP_APPS, MOBILE_APPS, type AppEntry } from "../lib/software";

const OUT = path.join(process.cwd(), "public/app-icons");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function main() {
await fs.mkdir(OUT, { recursive: true });

const standalone = [...MOBILE_APPS, ...DESKTOP_APPS].filter((app) => !app.aiSlug);
console.log(`[apps] ${standalone.length} standalone icons needed`);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenMatch(appName: string, trackName: string) {
  const stop = new Set(["ai", "app", "apps", "the", "and", "for", "by", "assistant", "chatbot"]);
  const wanted = normalize(appName)
    .split(" ")
    .filter((t) => t.length >= 3 && !stop.has(t));
  const hay = normalize(trackName);
  return wanted.length > 0 && wanted.every((token) => hay.includes(token));
}

async function fetchBuffer(url: string, limit = 6_000_000) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": UA, accept: "image/*,*/*;q=0.8" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    const len = Number(res.headers.get("content-length") || 0);
    if (len > limit) return null;
    if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg|ico)(\?|$)/i.test(url)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 200 || buffer.length > limit) return null;
    return buffer;
  } catch {
    return null;
  }
}

async function toPng(buffer: Buffer) {
  try {
    const meta = await sharp(buffer, { density: 384 }).metadata();
    const min = Math.min(meta.width || 0, meta.height || 0);
    if (!min) return null;
    const png = await sharp(buffer, { density: 384 })
      .resize(96, 96, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return { png, min };
  } catch {
    return null;
  }
}

async function htmlIcons(url: string) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": UA, accept: "text/html" },
    });
    if (!res.ok) return [];
    const html = (await res.text()).slice(0, 1_500_000);
    const found: { url: string; hint: number }[] = [];
    for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
      if (!/rel\s*=\s*["'][^"']*icon/i.test(tag)) continue;
      const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!href || href.startsWith("data:")) continue;
      const rel = tag.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
      const sizes = tag.match(/sizes\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
      let hint = /apple-touch-icon/.test(rel) ? 180 : 0;
      const size = Number(sizes.split("x")[0]);
      if (Number.isFinite(size) && size > hint) hint = size;
      if (!hint && /svg/.test(href)) hint = 128;
      try {
        found.push({ url: new URL(href, res.url || url).toString(), hint });
      } catch {}
    }
    return found.sort((a, b) => b.hint - a.hint);
  } catch {
    return [];
  }
}

async function appStoreIcon(app: AppEntry) {
  try {
    const term = encodeURIComponent(app.name.split(" - ")[0]);
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=software&limit=8&country=us`, {
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": UA },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { trackName: string; artworkUrl512?: string }[] };
    const match = (json.results || []).find(
      (row) => row.artworkUrl512 && tokenMatch(app.name, row.trackName),
    );
    if (!match?.artworkUrl512) return null;
    console.log(`[apps] store ${app.slug} <- ${match.trackName}`);
    return { url: match.artworkUrl512, hint: 512 };
  } catch {
    return null;
  }
}

async function handle(app: AppEntry) {
  const domain = app.website.replace(/^https?:\/\//, "").split("/")[0];
  const candidates: { url: string; hint: number }[] = [];

  if (app.kind === "mobile") {
    const store = await appStoreIcon(app);
    if (store) candidates.push(store);
  }

  candidates.push(...(await htmlIcons(app.website)));
  candidates.push(
    { url: `https://${domain}/apple-touch-icon.png`, hint: 180 },
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`, hint: 64 },
  );

  let best: { png: Buffer; min: number; score: number; source: string } | null = null;
  const tried = new Set<string>();
  for (const candidate of candidates.slice(0, 12)) {
    if (!candidate.url || tried.has(candidate.url)) continue;
    tried.add(candidate.url);
    const buffer = await fetchBuffer(candidate.url);
    if (!buffer) continue;
    const converted = await toPng(buffer);
    if (!converted) continue;
    const score = converted.min + candidate.hint;
    if (!best || score > best.score) best = { ...converted, score, source: candidate.url };
    if (converted.min >= 180) break;
  }

  if (!best) {
    console.log(`[apps] MISS ${app.kind} ${app.slug} (${domain})`);
    return false;
  }
  await fs.writeFile(path.join(OUT, `${app.slug}.png`), best.png);
  console.log(`[apps] ok ${app.kind} ${app.slug} ${best.min}px <- ${best.source}`);
  return true;
}

const queue = [...standalone];
let done = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const app = queue.shift();
      if (!app) break;
      if (await handle(app)) {
        done++;
      } else {
        failed++;
      }
    }
  }),
);
console.log(`[apps] DONE ok=${done} failed=${failed}`);
}

void main();
