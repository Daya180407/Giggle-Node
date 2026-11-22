import { NextResponse } from "next/server";
import { requestIp } from "@/lib/auth";
import {
  cacheEntryFor,
  cacheLimitHit,
  runAiSearch,
  recordSearchRequest,
  searchUsageToday,
  type SearchCard,
} from "@/lib/ai-search";
import { formatMoney } from "@/lib/analytics";
import { hashIp } from "@/lib/guard";
import { recordSearch } from "@/lib/search-log";
import { getSiteSettings } from "@/lib/settings";
import { mutateDb, readDb } from "@/lib/store";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

function withPrice(card: SearchCard | null, settings: SiteSettings) {
  if (!card) return null;
  return { ...card, priceLabel: formatMoney(card, settings.appearance) };
}

function response(
  outcome: Awaited<ReturnType<typeof runAiSearch>>,
  settings: SiteSettings,
  limitReached: boolean,
) {
  const db = readDb();
  return {
    main_result: withPrice(outcome.main, settings),
    other_results: outcome.others.map((card) => withPrice(card, settings)),
    free_alternative: withPrice(outcome.freeAlternative, settings),
    top_results: outcome.topResults.map((card) => withPrice(card, settings)),
    meta: {
      ...outcome.meta,
      source: limitReached ? "limit" : outcome.meta.source,
      limitReached,
      limits: {
        daily: settings.aiSearch.dailyLimit,
        perMinute: settings.aiSearch.perMinuteLimit,
        cacheHours: settings.aiSearch.cacheHours,
      },
      usage: searchUsageToday(db),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 200).trim();
  const noStore = { "cache-control": "no-store" };

  if (query.length < 2) {
    return NextResponse.json(
      {
        main_result: null,
        other_results: [],
        free_alternative: null,
        top_results: [],
        meta: { error: "query-too-short" },
      },
      { status: 400, headers: noStore },
    );
  }

  const db = readDb();
  const settings = getSiteSettings(db);
  const ipHash = await hashIp(await requestIp());
  const limits = cacheLimitHit(db, settings);
  const limitReached =
    limits.perMinute >= settings.aiSearch.perMinuteLimit || limits.daily >= settings.aiSearch.dailyLimit;

  // Over the limit: cached answer when present, otherwise a keyword-only pick. No LLM call.
  const outcome = await runAiSearch(db, query, settings, { skipLlm: limitReached });
  const resolved = limitReached && outcome.meta.source !== "cache" ? { ...outcome, meta: { ...outcome.meta, source: "limit" as const } } : outcome;

  mutateDb((draft) => {
    const now = new Date().toISOString();
    recordSearchRequest(draft, {
      q: outcome.meta.normalized,
      ipHash,
      at: now,
      cached: outcome.meta.cached,
      source: limitReached ? "limit" : outcome.meta.source,
    });

    if (!Array.isArray(draft.searchCache)) draft.searchCache = [];
    const index = draft.searchCache.findIndex((row) => row.normalized === outcome.meta.normalized);
    if (outcome.meta.cached && index >= 0) {
      draft.searchCache[index].hits += 1;
    } else if (settings.aiSearch.cacheEnabled && !limitReached && !outcome.meta.empty) {
      const entry = cacheEntryFor(outcome, query);
      if (index >= 0) {
        entry.createdAt = draft.searchCache[index].createdAt;
        entry.hits = draft.searchCache[index].hits;
        draft.searchCache[index] = entry;
      } else {
        draft.searchCache.unshift(entry);
      }
      draft.searchCache = draft.searchCache.slice(0, 300);
    }
  });

  recordSearch(query);
  return NextResponse.json(response(resolved, settings, limitReached), { headers: noStore });
}
