import "server-only";
import type { Ai, AiSearchSettings, DB, SearchCacheEntry, SearchRequest, SiteSettings } from "./types";
import { getCategories } from "./categories";
import { buildView, rankedAis, searchAll, type AiStat, type View } from "./rank";
import { isAiSponsored } from "./sponsors";

/**
 * AI search pipeline.
 *
 * The language model is ONLY a classifier: it returns a category, a budget and a
 * short use-case. Every tool name, logo, score and price comes from our own
 * catalogue, so the model can never invent an AI.
 */

export type SearchCard = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  color: string;
  category: string;
  categoryName: string;
  priceType: Ai["priceType"];
  planPrice: number;
  planPriceInr: number;
  description: string;
  bestFor: string[];
  score: number;
  votes: number;
  sponsored: boolean;
  /** formatted by the API using the site's currency setting */
  priceLabel?: string;
};

export type SearchMeta = {
  query: string;
  normalized: string;
  category: string | null;
  categoryName: string | null;
  budget: "free" | "freemium" | "paid" | "any";
  useCase: string;
  source: "cache" | "llm" | "fallback" | "limit";
  cached: boolean;
  empty: boolean;
  provider: string;
  error?: string | null;
};

export type SearchOutcome = {
  main: SearchCard | null;
  others: SearchCard[];
  freeAlternative: SearchCard | null;
  topResults: SearchCard[];
  meta: SearchMeta;
  cacheEntry?: SearchCacheEntry;
};

const CATEGORY_LABELS = [
  "Writing",
  "Coding",
  "Image",
  "Video",
  "Voice",
  "Music",
  "Design",
  "Productivity",
  "Business",
  "Education",
  "Other",
];

const KEYWORD_CATEGORY: { words: string[]; category: string }[] = [
  { words: ["video", "reel", "youtube video", "sora", "veo", "runway", "animation", "clip"], category: "video" },
  { words: ["code", "coding", "programmer", "developer", "debug", "software"], category: "coding" },
  { words: ["image", "photo", "thumbnail", "picture", "art", "midjourney", "design"], category: "image" },
  { words: ["write", "writing", "blog", "copy", "email", "essay", "content", "translation", "article"], category: "writing" },
  { words: ["voice", "audio", "dubbing", "speech", "voiceover", "tts"], category: "voice" },
  { words: ["music", "song", "beat", "jingle"], category: "music" },
  { words: ["design", "poster", "logo", "presentation", "ui"], category: "design" },
  { words: ["meeting", "notes", "productivity", "slides", "research", "summary"], category: "productivity" },
  { words: ["business", "sales", "crm", "support", "customer"], category: "business" },
  { words: ["study", "education", "student", "learn", "exam"], category: "education" },
  { words: ["agent", "automation", "workflow", "browser"], category: "agents" },
  { words: ["seo", "marketing", "ads", "instagram", "social"], category: "marketing" },
];

export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function categorySlugFrom(value: string | undefined, db: DB): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned || cleaned === "other") return null;
  const own = getCategories(db);
  const direct = own.find((c) => c.slug === cleaned || c.name.toLowerCase() === cleaned);
  if (direct) return direct.slug;
  const alias = KEYWORD_CATEGORY.find((row) => row.category === cleaned || row.words.includes(cleaned));
  return alias?.category ?? null;
}

function detectBudget(query: string): "free" | "freemium" | "paid" | "any" {
  const q = query.toLowerCase();
  if (/\b(free|muft|freemium|no cost|zero cost)\b/.test(q)) return "free";
  if (/\b(paid|premium|paisa|subscription)\b/.test(q)) return "paid";
  return "any";
}

/** Deterministic keyword intent used when no model call is allowed or it fails. */
export function keywordIntent(query: string, db: DB): {
  category: string | null;
  budget: "free" | "freemium" | "paid" | "any";
  useCase: string;
} {
  const q = query.toLowerCase();
  let best: { category: string; score: number } | null = null;
  for (const row of KEYWORD_CATEGORY) {
    const score = row.words.reduce((sum, word) => (q.includes(word) ? sum + word.length : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { category: row.category, score };
  }
  const known = best ? categorySlugFrom(best.category, db) : null;
  return { category: known, budget: detectBudget(query), useCase: query.slice(0, 120) };
}

function envKey(provider: AiSearchSettings["provider"]): string {
  if (provider === "gemini") return process.env.GEMINI_API_KEY ?? "";
  if (provider === "groq") return process.env.GROQ_API_KEY ?? "";
  return process.env.DEEPSEEK_API_KEY ?? "";
}

export function providerHasKey(settings: AiSearchSettings): boolean {
  return Boolean(settings.apiKey.trim() || envKey(settings.provider));
}

function providerRequest(
  settings: AiSearchSettings,
  prompt: string,
): { url: string; headers: Record<string, string>; body: unknown } {
  const key = settings.apiKey.trim() || envKey(settings.provider);
  if (settings.provider === "gemini") {
    const model = settings.model.trim() || "gemini-2.0-flash-lite";
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      headers: { "content-type": "application/json" },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200, responseMimeType: "application/json" },
      },
    };
  }
  if (settings.provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: {
        model: settings.model.trim() || "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      },
    };
  }
  return {
    url: "https://api.deepseek.com/chat/completions",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: {
      model: settings.model.trim() || "deepseek-chat",
      temperature: 0,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    },
  };
}

function extractText(provider: AiSearchSettings["provider"], payload: unknown): string {
  try {
    if (provider === "gemini") {
      const parts = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]
        ?.content?.parts;
      return parts?.map((p) => p.text ?? "").join(" ") ?? "";
    }
    const choice = (payload as { choices?: { message?: { content?: string } }[] }).choices?.[0];
    return choice?.message?.content ?? "";
  } catch {
    return "";
  }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function classifyWithProvider(
  query: string,
  db: DB,
  settings: AiSearchSettings,
): Promise<{
  intent: { category: string | null; budget: "free" | "freemium" | "paid" | "any"; useCase: string } | null;
  error: string | null;
}> {
  if (!providerHasKey(settings)) return { intent: null, error: "No API key configured." };

  const prompt = settings.prompt.includes("{{query}}")
    ? settings.prompt.replaceAll("{{query}}", query)
    : `${settings.prompt}\n\nUser query: ${query}`;
  const request = providerRequest(settings, prompt);

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 220);
      return { intent: null, error: `${settings.provider} HTTP ${response.status}: ${detail}` };
    }
    const payload = (await response.json()) as unknown;
    const parsed = parseJsonObject(extractText(settings.provider, payload));
    if (!parsed) return { intent: null, error: "Provider returned non-JSON content." };

    const category = categorySlugFrom(typeof parsed.category === "string" ? parsed.category : undefined, db);
    const budgetRaw = typeof parsed.budget === "string" ? parsed.budget.trim().toLowerCase() : "any";
    const budget =
      budgetRaw === "free" || budgetRaw === "freemium" || budgetRaw === "paid" ? budgetRaw : "any";
    const useCase = typeof parsed.use_case === "string" ? parsed.use_case.slice(0, 140) : query.slice(0, 120);
    return { intent: { category, budget, useCase }, error: null };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { intent: null, error: message.slice(0, 240) };
  }
}

export function cardFor(stat: AiStat, db: DB): SearchCard {
  const category = getCategories(db).find((c) => c.slug === stat.ai.category);
  return {
    id: stat.ai.id,
    name: stat.ai.name,
    slug: stat.ai.slug,
    logo: stat.ai.logo,
    color: stat.ai.color,
    category: stat.ai.category,
    categoryName: category?.name ?? stat.ai.category,
    priceType: stat.ai.priceType,
    planPrice: stat.ai.planPrice,
    planPriceInr: stat.ai.planPriceInr ?? 0,
    description: stat.ai.description,
    bestFor: stat.ai.bestFor.slice(0, 3),
    score: Math.round(stat.score * 100) / 100,
    votes: stat.votes,
    sponsored: isAiSponsored(stat.ai),
  };
}

function budgetAllows(stat: AiStat, budget: SearchMeta["budget"]): boolean {
  if (budget === "any" || budget === "paid") return true;
  if (budget === "free") return stat.ai.priceType !== "paid";
  return stat.ai.priceType !== "paid";
}

function rankFor(view: View, query: string, intent: { category: string | null; budget: SearchMeta["budget"] }) {
  const inCategory = intent.category ? rankedAis(view, intent.category) : [];
  const filtered = inCategory.filter((s) => budgetAllows(s, intent.budget));
  if (filtered.length > 0) {
    if (intent.budget === "paid") {
      return [...filtered].sort(
        (a, b) => Number(b.ai.priceType === "paid") - Number(a.ai.priceType === "paid") || b.score - a.score,
      );
    }
    return filtered;
  }
  // Category had nothing for this budget: fall back to keyword text search.
  const keyword = searchAll(view, query).ais;
  if (keyword.length > 0) return keyword;
  return inCategory.length > 0 ? inCategory : [];
}

function resolveCacheEntry(view: View, db: DB, entry: SearchCacheEntry): SearchOutcome | null {
  const toCard = (id: string | null) => {
    if (!id) return null;
    const stat = view.aiStats.get(id);
    return stat && !stat.ai.hidden ? cardFor(stat, db) : null;
  };
  const main = toCard(entry.mainId);
  if (!main) return null;
  const others = entry.otherIds.map(toCard).filter((c): c is SearchCard => Boolean(c));
  return {
    main,
    others,
    freeAlternative: toCard(entry.freeId),
    topResults: [],
    meta: {
      query: entry.query,
      normalized: entry.normalized,
      category: entry.category || null,
      categoryName: entry.category ? getCategories(db).find((c) => c.slug === entry.category)?.name ?? entry.category : null,
      budget: entry.budget,
      useCase: entry.useCase,
      source: "cache",
      cached: true,
      empty: false,
      provider: "cache",
    },
  };
}

export function findCacheEntry(db: DB, normalized: string, hours: number): SearchCacheEntry | undefined {
  if (!Array.isArray(db.searchCache)) return undefined;
  const cutoff = Date.now() - Math.max(1, hours) * 3600000;
  return db.searchCache.find((row) => row.normalized === normalized && +new Date(row.updatedAt) > cutoff);
}

export function cacheEntryFor(outcome: SearchOutcome, query: string): SearchCacheEntry {
  const now = new Date().toISOString();
  return {
    normalized: outcome.meta.normalized,
    query,
    category: outcome.meta.category ?? "",
    budget: outcome.meta.budget,
    useCase: outcome.meta.useCase,
    mainId: outcome.main?.id ?? null,
    otherIds: outcome.others.map((c) => c.id),
    freeId: outcome.freeAlternative?.id ?? null,
    source: outcome.meta.source === "llm" ? "llm" : "fallback",
    hits: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function runAiSearch(
  db: DB,
  rawQuery: string,
  settings: SiteSettings,
  options: { skipLlm?: boolean } = {},
): Promise<SearchOutcome> {
  const query = rawQuery.trim().slice(0, 200);
  const normalized = normalizeQuery(query);
  const view = buildView(db);
  const aiSettings = settings.aiSearch;

  if (aiSettings.cacheEnabled) {
    const entry = findCacheEntry(db, normalized, aiSettings.cacheHours);
    if (entry) {
      const cached = resolveCacheEntry(view, db, entry);
      if (cached) return cached;
    }
  }

  let intent = keywordIntent(query, db);
  let source: SearchMeta["source"] = "fallback";
  let error: string | null = null;

  if (aiSettings.enabled && !options.skipLlm && providerHasKey(aiSettings)) {
    const llm = await classifyWithProvider(query, db, aiSettings);
    if (llm.intent) {
      // An unknown/Other category from the model still gets our keyword category,
      // so a valid Hindi question is never lost to an "Other" label.
      const fallback = keywordIntent(query, db);
      intent = {
        category: llm.intent.category ?? fallback.category,
        budget: llm.intent.budget !== "any" ? llm.intent.budget : fallback.budget,
        useCase: llm.intent.useCase || fallback.useCase,
      };
      source = "llm";
    } else {
      error = llm.error;
    }
  }

  const ranked = rankFor(view, query, intent);
  const mainStat = ranked[0];
  const selected = ranked.slice(0, 3);
  const freeStat =
    mainStat && mainStat.ai.priceType === "paid"
      ? ranked.find(
          (s) =>
            s.ai.id !== mainStat.ai.id &&
            s.ai.priceType !== "paid" &&
            !selected.some((chosen) => chosen.ai.id === s.ai.id),
        ) ?? ranked.find((s) => s.ai.priceType !== "paid" && s.ai.id !== mainStat.ai.id)
      : undefined;

  const allTop = mainStat ? [] : rankedAis(view).slice(0, 3);

  return {
    main: mainStat ? cardFor(mainStat, db) : null,
    others: selected.slice(1).map((s) => cardFor(s, db)),
    freeAlternative: freeStat ? cardFor(freeStat, db) : null,
    topResults: allTop.map((s) => cardFor(s, db)),
    meta: {
      query,
      normalized,
      category: intent.category,
      categoryName: intent.category
        ? getCategories(db).find((c) => c.slug === intent.category)?.name ?? intent.category
        : null,
      budget: intent.budget,
      useCase: intent.useCase,
      source,
      cached: false,
      empty: !mainStat,
      provider: aiSettings.provider,
      error,
    },
  };
}

export function cacheLimitHit(db: DB, settings: SiteSettings): { perMinute: number; daily: number } {
  const now = Date.now();
  const requests = (db.searchRequests ?? []).filter((r) => now - +new Date(r.at) < 86400000);
  const minute = requests.filter((r) => now - +new Date(r.at) < 60000).length;
  return { perMinute: minute, daily: requests.length };
}

export function searchUsageToday(db: DB): { requests: number; cached: number; llm: number } {
  const cutoff = Date.now() - 86400000;
  const rows = (db.searchRequests ?? []).filter((r) => +new Date(r.at) > cutoff);
  return {
    requests: rows.length,
    cached: rows.filter((r) => r.cached).length,
    llm: rows.filter((r) => r.source === "llm").length,
  };
}

export function recordSearchRequest(db: DB, row: SearchRequest) {
  if (!Array.isArray(db.searchRequests)) db.searchRequests = [];
  db.searchRequests.unshift(row);
  // Keep enough history for a full daily-limit window.
  db.searchRequests = db.searchRequests.slice(0, 1200);
}

export const SEARCH_CATEGORY_LABELS = CATEGORY_LABELS;
