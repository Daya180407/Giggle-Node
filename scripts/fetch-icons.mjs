import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const ROOT = process.cwd();
const DB_FILE = path.join(ROOT, "data/db.json");
const OUT_DIR = path.join(ROOT, "public/logos");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const db = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
await fs.mkdir(OUT_DIR, { recursive: true });
const have = new Set(await fs.readdir(OUT_DIR));
const targets = db.ai.filter((ai) => !have.has(`${ai.slug}.png`));
console.log(`[icons] ${targets.length} missing of ${db.ai.length}`);

let googlePlaceholder = null;
try {
  const res = await fetch("https://www.google.com/s2/favicons?domain=definitely-not-a-real-domain-xyz987.com&sz=256", {
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) googlePlaceholder = crypto.createHash("sha1").update(Buffer.from(await res.arrayBuffer())).digest("hex");
} catch {}

const timeout = (ms) => AbortSignal.timeout(ms);

async function fetchBuffer(url, limit = 5_000_000) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: timeout(9000),
      headers: { "user-agent": UA, accept: "image/*,*/*;q=0.8" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    const len = Number(res.headers.get("content-length") || 0);
    if (len > limit) return null;
    if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg|ico)(\?|$)/i.test(url)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 200 || buffer.length > limit) return null;
    return { buffer, type };
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: timeout(8000),
      headers: { "user-agent": UA, accept: "text/html" },
    });
    if (!res.ok) return { html: "", finalUrl: url };
    const text = await res.text();
    return { html: text.slice(0, 1_500_000), finalUrl: res.url || url };
  } catch {
    return { html: "", finalUrl: url };
  }
}

function parseIcons(html, baseUrl) {
  const out = [];
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/rel\s*=\s*["'][^"']*icon/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("data:")) continue;
    const rel = tag.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    const sizes = tag.match(/sizes\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    let width = 0;
    if (/apple-touch-icon/.test(rel)) width = 180;
    const size = Number(sizes.split("x")[0]);
    if (Number.isFinite(size) && size > width) width = size;
    if (!width && /svg/.test(href)) width = 128;
    try {
      out.push({ url: new URL(href, baseUrl).toString(), hint: width });
    } catch {}
  }
  return out.sort((a, b) => b.hint - a.hint);
}

async function toPng(candidate) {
  const { buffer } = candidate;
  try {
    const meta = await sharp(buffer, { density: 384 }).metadata();
    const min = Math.min(meta.width || 0, meta.height || 0);
    if (!min) return null;
    let png;
    try {
      png = await sharp(buffer, { density: 384 })
        .resize(96, 96, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
    } catch {
      return null;
    }
    return { png, min };
  } catch {
    return null;
  }
}

async function handle(ai) {
  const domain = ai.website.replace(/^https?:\/\//, "").split("/")[0];
  const candidates = [];

  const { html, finalUrl } = await fetchHtml(`https://${domain}`);
  if (html) candidates.push(...parseIcons(html, finalUrl));

  candidates.push(
    { url: `https://${domain}/apple-touch-icon.png`, hint: 180 },
    { url: `https://logo.clearbit.com/${domain}?size=256`, hint: 256 },
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`, hint: 32 },
    { url: `https://icons.duckduckgo.com/ip3/${domain}.ico`, hint: 32 },
  );

  let best = null;
  const tried = new Set();
  for (const candidate of candidates.slice(0, 10)) {
    if (!candidate.url || tried.has(candidate.url)) continue;
    tried.add(candidate.url);
    const fetched = await fetchBuffer(candidate.url);
    if (!fetched) continue;
    if (googlePlaceholder && candidate.url.includes("google.com/s2")) {
      const hash = crypto.createHash("sha1").update(fetched.buffer).digest("hex");
      if (hash === googlePlaceholder) continue;
    }
    const converted = await toPng(fetched);
    if (!converted) continue;
    const score = converted.min + (candidate.hint >= 128 ? 10 : 0);
    if (!best || score > best.score) best = { ...converted, score, source: candidate.url, min: converted.min };
    if (converted.min >= 96) break;
  }

  if (!best) {
    console.log(`[icons] MISS ${ai.slug} (${domain})`);
    return { ok: false, slug: ai.slug };
  }

  await fs.writeFile(path.join(OUT_DIR, `${ai.slug}.png`), best.png);
  console.log(`[icons] ok ${ai.slug} ${best.min}px <- ${best.source}`);
  return { ok: true };
}

const queue = [...targets];
let done = 0;
let failed = 0;
const workers = Array.from({ length: 12 }, async () => {
  while (queue.length) {
    const ai = queue.shift();
    if (!ai) break;
    const result = await handle(ai);
    if (!result.ok) failed++;
    done++;
    if (done % 20 === 0) console.log(`[icons] progress ${done}/${targets.length} failed=${failed}`);
  }
});
await Promise.all(workers);
console.log(`[icons] DONE ${done} failed=${failed}`);
