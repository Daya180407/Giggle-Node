import type { AppearanceSettings, DB } from "./types";

/** Classifies a referrer into a channel the analytics page can report on. */
export function classifyReferrer(referrer: string | null | undefined, origin?: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (origin) {
      try {
        if (host === new URL(origin).hostname.replace(/^www\./, "").toLowerCase()) return "internal";
      } catch {
        // ignore malformed origin
      }
    }
    if (host.includes("google")) return "google";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host === "x.com" || host.includes("twitter") || host.includes("t.co")) return "x";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("reddit")) return "reddit";
    if (host.includes("linkedin")) return "linkedin";
    if (host.includes("whatsapp")) return "whatsapp";
    if (host.includes("bing")) return "bing";
    if (host.includes("chatgpt") || host.includes("openai") || host.includes("perplexity")) return "ai-chat";
    return host || "other";
  } catch {
    return "other";
  }
}

export function recordTraffic(db: DB, source: string): void {
  if (!Array.isArray(db.traffic)) db.traffic = [];
  const at = new Date().toISOString();
  const row = db.traffic.find((entry) => entry.source === source);
  if (row) {
    row.count += 1;
    row.lastAt = at;
  } else {
    db.traffic.push({ source, count: 1, lastAt: at });
  }
  db.traffic = db.traffic.sort((a, b) => b.count - a.count).slice(0, 40);
}

const ACCENTS: Record<AppearanceSettings["accent"], { brand: string; dark: string; soft: string }> = {
  indigo: { brand: "#4f46e5", dark: "#4338ca", soft: "#eef2ff" },
  cyan: { brand: "#0e7490", dark: "#155e75", soft: "#ecfeff" },
  emerald: { brand: "#047857", dark: "#065f46", soft: "#ecfdf5" },
  rose: { brand: "#be123c", dark: "#9f1239", soft: "#fff1f2" },
  amber: { brand: "#b45309", dark: "#92400e", soft: "#fffbeb" },
};

export function accentVars(appearance: AppearanceSettings): Record<string, string> {
  const accent = ACCENTS[appearance.accent] ?? ACCENTS.indigo;
  return {
    "--color-brand": accent.brand,
    "--color-brand-dark": accent.dark,
    "--color-brand-soft": accent.soft,
  };
}

export function activeLogo(appearance: AppearanceSettings): string {
  const festiveValid =
    appearance.festiveLogo &&
    (!appearance.festiveLogoUntil || +new Date(appearance.festiveLogoUntil) >= Date.now() - 86400000);
  return festiveValid ? appearance.festiveLogo : appearance.logoImage;
}

export function formatMoney(
  value: { planPrice: number; planPriceInr?: number; priceType?: string },
  appearance: AppearanceSettings,
): string {
  if (value.priceType === "free") return "Free";
  if (appearance.currency === "USD") return `$${value.planPrice}/mo`;
  const inr = value.planPriceInr && value.planPriceInr > 0
    ? value.planPriceInr
    : Math.round(value.planPrice * (appearance.usdRate || 88));
  return `₹${inr.toLocaleString("en-IN")}/mo`;
}
