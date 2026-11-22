import type { Ai, CategorySlug, Model } from "./types";

export type ApiPricingUnit = "1M tokens" | "image" | "second" | "1M characters" | "track" | "request";

export type ApiPricingInfo = {
  available: boolean;
  input: number | null;
  output: number | null;
  unit: ApiPricingUnit;
  contextWindow: number | null;
  estimated: boolean;
  /** true when an admin typed this price in the panel */
  manual: boolean;
  note?: string;
  source: string;
};

type Curated = Partial<Pick<ApiPricingInfo, "available" | "input" | "output" | "unit" | "contextWindow" | "note">>;

const OPENAI = "https://openai.com/api/pricing/";
const ANTHROPIC = "https://www.anthropic.com/pricing#api";
const GOOGLE = "https://ai.google.dev/gemini-api/docs/pricing";
const PERPLEXITY = "https://docs.perplexity.ai/guides/pricing";
const XAI = "https://docs.x.ai/docs/models";
const MISTRAL = "https://mistral.ai/pricing#api-pricing";
const DEEPL = "https://www.deepl.com/pro-api";
const STABILITY = "https://platform.stability.ai/pricing";
const IDEOGRAM = "https://ideogram.ai/pricing";
const RUNWAY = "https://docs.dev.runwayml.com/guides/pricing/";
const ELEVENLABS = "https://elevenlabs.io/pricing/api";
const MURF = "https://murf.ai/api/pricing";

/** Official list prices where available. Key = ai slug + model slug. */
const CURATED: Record<string, Curated & { source?: string }> = {
  "chatgpt|gpt-4o": { input: 2.5, output: 10, contextWindow: 128000, source: OPENAI },
  "chatgpt|o1": { input: 15, output: 60, contextWindow: 200000, source: OPENAI },
  "chatgpt|gpt-4o-mini": { input: 0.15, output: 0.6, contextWindow: 128000, source: OPENAI },
  "claude|claude-sonnet-4-5": { input: 3, output: 15, contextWindow: 200000, source: ANTHROPIC },
  "claude|claude-opus-4-1": { input: 15, output: 75, contextWindow: 200000, source: ANTHROPIC },
  "claude|claude-haiku-3-5": { input: 0.8, output: 4, contextWindow: 200000, source: ANTHROPIC },
  "gemini|gemini-2-5-pro": { input: 1.25, output: 10, contextWindow: 1000000, source: GOOGLE },
  "gemini|gemini-2-5-flash": { input: 0.3, output: 2.5, contextWindow: 1000000, source: GOOGLE },
  "perplexity|sonar-pro": { input: 3, output: 15, contextWindow: 200000, source: PERPLEXITY },
  "perplexity|sonar": { input: 1, output: 1, contextWindow: 200000, source: PERPLEXITY },
  "grok|grok-3-mini": { input: 0.3, output: 0.5, contextWindow: 131072, source: XAI },
  "mistral|mistral-large-2": { input: 2, output: 6, contextWindow: 128000, source: MISTRAL },
  "deepl|deepl-pro": { unit: "1M characters", input: 20, contextWindow: null, source: DEEPL },
  "deepl|deepl-free": {
    unit: "1M characters",
    input: 0,
    contextWindow: null,
    note: "Free API allowance: 500K characters/month, then Pro rates apply.",
    source: DEEPL,
  },
  "murf-ai|murf-gen2": { unit: "1M characters", input: 60, contextWindow: null, source: MURF },
  "dall-e-3|dall-e-3": { unit: "image", input: 0.04, contextWindow: null, source: OPENAI },
  "dall-e-3|dall-e-3-hd": { unit: "image", input: 0.08, contextWindow: null, source: OPENAI },
  "stable-diffusion|sdxl": {
    unit: "image",
    input: 0.003,
    contextWindow: null,
    note: "Open weights can be self-hosted for free; API rate depends on provider.",
    source: STABILITY,
  },
  "stable-diffusion|sd-3-5-large": {
    unit: "image",
    input: 0.065,
    contextWindow: null,
    note: "Open weights can be self-hosted; hosted API pricing varies.",
    source: STABILITY,
  },
  "stable-diffusion|sd-1-5": {
    unit: "image",
    input: 0.002,
    contextWindow: null,
    note: "Open weights — free to self-host; hosted API rates vary.",
    source: STABILITY,
  },
  "ideogram|ideogram-3-0": { unit: "image", input: 0.08, contextWindow: null, source: IDEOGRAM },
  "ideogram|ideogram-2-0": { unit: "image", input: 0.04, contextWindow: null, source: IDEOGRAM },
  "midjourney|midjourney-v7": {
    available: false,
    note: "No public API. Subscription plans start at $10/mo.",
    source: "https://www.midjourney.com/plans",
  },
  "midjourney|midjourney-v6-1": {
    available: false,
    note: "No public API. Subscription plans start at $10/mo.",
    source: "https://www.midjourney.com/plans",
  },
  "midjourney|niji-6": {
    available: false,
    note: "No public API. Available inside Midjourney subscription plans.",
    source: "https://www.midjourney.com/plans",
  },
  "runway|gen-4": { unit: "second", input: 0.12, contextWindow: null, source: RUNWAY },
  "runway|gen-3-alpha": { unit: "second", input: 0.05, contextWindow: null, source: RUNWAY },
  "sora|sora-2": { unit: "second", input: 0.1, contextWindow: null, source: OPENAI },
  "sora|sora-turbo": { unit: "second", input: 0.05, contextWindow: null, source: OPENAI },
  "pika|pika-1-5": { available: false, note: "No public API; free tier available in the app.", source: "https://pika.art/pricing" },
  "elevenlabs|eleven-v3": { unit: "1M characters", input: 150, contextWindow: null, source: ELEVENLABS },
  "elevenlabs|flash-v2-5": { unit: "1M characters", input: 75, contextWindow: null, source: ELEVENLABS },
  "elevenlabs|turbo-v2": { unit: "1M characters", input: 50, contextWindow: null, source: ELEVENLABS },
  "suno|suno-v4-5": { available: false, note: "No official public API; subscription only.", source: "https://suno.com/pricing" },
  "suno|suno-v4": { available: false, note: "No official public API; subscription only.", source: "https://suno.com/pricing" },
  "suno|suno-v3-5": { available: false, note: "No official public API; free plan available in the app.", source: "https://suno.com/pricing" },
  "udio|udio-1-5": { available: false, note: "No public API; subscription only.", source: "https://www.udio.com/pricing" },
  "udio|udio-free": { available: false, note: "No public API; free tier available in the app.", source: "https://www.udio.com/pricing" },
  "cursor|cursor-agent": {
    available: false,
    note: "Included in Cursor plans; Cursor does not sell model API access.",
    source: "https://cursor.com/pricing",
  },
  "cursor|cursor-tab": {
    available: false,
    note: "Included in Cursor plans; Cursor does not sell model API access.",
    source: "https://cursor.com/pricing",
  },
  "cursor|cursor-composer": {
    available: false,
    note: "Included in Cursor plans; Cursor does not sell model API access.",
    source: "https://cursor.com/pricing",
  },
  "github-copilot|copilot-chat": {
    available: false,
    note: "No standalone model API; included with Copilot plans from $10/mo.",
    source: "https://github.com/features/copilot/plans",
  },
  "github-copilot|copilot-edits": {
    available: false,
    note: "No standalone model API; included with Copilot plans from $10/mo.",
    source: "https://github.com/features/copilot/plans",
  },
  "notion-ai|notion-ai": {
    available: false,
    note: "No public model API; included in Notion AI plans.",
    source: "https://www.notion.com/pricing",
  },
  "notion-ai|notion-ai-free": {
    available: false,
    note: "No public model API; limited AI included in Notion plans.",
    source: "https://www.notion.com/pricing",
  },
  "figma-ai|figma-make": {
    available: false,
    note: "No public model API; included in Figma plans.",
    source: "https://www.figma.com/pricing/",
  },
  "figma-ai|figma-ai-beta": {
    available: false,
    note: "No public model API; included in Figma plans.",
    source: "https://www.figma.com/pricing/",
  },
  "canva|magic-design": {
    available: false,
    note: "No public model API; included in Canva plans.",
    source: "https://www.canva.com/pricing/",
  },
  "canva|magic-write": {
    available: false,
    note: "No public model API; included in Canva plans.",
    source: "https://www.canva.com/pricing/",
  },
  "gamma|gamma-3": {
    available: false,
    note: "No public model API; subscription and credit plans.",
    source: "https://gamma.app/pricing",
  },
  "gamma|gamma-2": {
    available: false,
    note: "No public model API; subscription and credit plans.",
    source: "https://gamma.app/pricing",
  },
  "descript|descript-studio": {
    available: false,
    note: "No public model API; editing plans start at $19/mo.",
    source: "https://www.descript.com/pricing",
  },
  "descript|underlord": {
    available: false,
    note: "No public model API; included in Descript plans.",
    source: "https://www.descript.com/pricing",
  },
  "quillbot|quillbot-premium": {
    available: false,
    note: "No public model API; subscription only.",
    source: "https://quillbot.com/premium",
  },
  "quillbot|quillbot-free": {
    available: false,
    note: "No public model API; free web tier available.",
    source: "https://quillbot.com/premium",
  },
  "duolingo-max|duolingo-max": {
    available: false,
    note: "No public model API; subscription only.",
    source: "https://www.duolingo.com/max",
  },
  "pika|pika-2-2": { available: false, note: "No public API; subscription only.", source: "https://pika.art/pricing" },
  "heygen|avatar-iv": {
    available: false,
    note: "API access uses custom credits; confirm current rates with HeyGen.",
    source: "https://www.heygen.com/api",
  },
};

const PRICING_URLS: Record<string, string> = {
  chatgpt: OPENAI,
  claude: ANTHROPIC,
  gemini: GOOGLE,
  perplexity: PERPLEXITY,
  grok: XAI,
  mistral: MISTRAL,
  deepl: DEEPL,
  "murf-ai": MURF,
  elevenlabs: ELEVENLABS,
  "dall-e-3": OPENAI,
  "stable-diffusion": STABILITY,
  ideogram: IDEOGRAM,
  runway: RUNWAY,
  sora: OPENAI,
};

const TEXT_CATEGORIES = new Set<CategorySlug>([
  "writing",
  "coding",
  "research",
  "productivity",
  "marketing",
  "education",
  "social",
  "agents",
  "business",
  "specialized",
]);

function tierMultiplier(name: string) {
  const value = name.toLowerCase();
  if (/(mini|flash|haiku|turbo|small|lite|free|nano)/.test(value)) return 0.25;
  if (/(pro|opus|ultra|max|large|advanced|reason)/.test(value)) return 1.8;
  return 1;
}

function roundRate(value: number) {
  if (value >= 10) return Math.round(value * 100) / 100;
  if (value >= 1) return Math.round(value * 100) / 100;
  return Math.round(value * 10000) / 10000;
}

/**
 * API list price for a model. Curated official rates are used where known;
 * everything else gets an indicative rate derived from the product's plan
 * price and category, clearly flagged as estimated in the UI.
 */
export function getApiPricing(ai: Ai, model: Model): ApiPricingInfo {
  if (model.pricing) {
    return {
      available: model.pricing.available,
      input: model.pricing.input,
      output: model.pricing.output,
      unit: (model.pricing.unit || (TEXT_CATEGORIES.has(ai.category) ? "1M tokens" : "request")) as ApiPricingUnit,
      contextWindow: model.pricing.contextWindow,
      estimated: false,
      manual: true,
      note: model.pricing.note || undefined,
      source: model.pricing.source || ai.website,
    };
  }

  const key = `${ai.slug}|${model.slug}`;
  const curated = CURATED[key];
  if (curated) {
    return {
      available: curated.available ?? true,
      input: curated.input ?? null,
      output: curated.output ?? null,
      unit: curated.unit ?? (TEXT_CATEGORIES.has(ai.category) ? "1M tokens" : "request"),
      contextWindow:
        curated.contextWindow !== undefined
          ? curated.contextWindow
          : TEXT_CATEGORIES.has(ai.category)
            ? 128000
            : null,
      estimated: false,
      manual: false,
      note: curated.note,
      source: curated.source ?? PRICING_URLS[ai.slug] ?? ai.website,
    };
  }

  const source = PRICING_URLS[ai.slug] ?? ai.website;
  const multiplier = tierMultiplier(model.name);

  if (ai.category === "image" || ai.category === "design") {
    const base = ai.unitCost > 0 ? ai.unitCost / 2 : 0.01;
    return {
      available: true,
      input: roundRate(Math.min(0.12, Math.max(0.005, base * multiplier))),
      output: null,
      unit: "image",
      contextWindow: null,
      estimated: true,
      manual: false,
      note: "Indicative per-image rate — confirm the provider's current API price.",
      source,
    };
  }

  if (ai.category === "video") {
    const base = ai.unitCost > 0 ? ai.unitCost / 3 : 0.05;
    return {
      available: true,
      input: roundRate(Math.min(0.25, Math.max(0.02, base * multiplier))),
      output: null,
      unit: "second",
      contextWindow: null,
      estimated: true,
      manual: false,
      note: "Indicative per-second rate — video APIs often bill in credits.",
      source,
    };
  }

  if (ai.category === "voice") {
    const base = ai.unitCost > 0 ? ai.unitCost * 3000 : 60;
    return {
      available: true,
      input: roundRate(Math.min(300, Math.max(10, base * multiplier))),
      output: null,
      unit: "1M characters",
      contextWindow: null,
      estimated: true,
      manual: false,
      note: "Indicative character-based rate — check the voice provider's API tier.",
      source,
    };
  }

  if (ai.category === "music") {
    return {
      available: true,
      input: roundRate(Math.max(0.05, ai.unitCost || 0.05)),
      output: null,
      unit: "track",
      contextWindow: null,
      estimated: true,
      manual: false,
      note: "Indicative per-track rate — music APIs usually bill in credits.",
      source,
    };
  }

  const plan = ai.planPrice > 0 ? ai.planPrice : 10;
  const input = Math.max(0.05, (plan / 20) * multiplier);
  const output = Math.max(input * 3, input + 0.25);
  return {
    available: true,
    input: roundRate(input),
    output: roundRate(output),
    unit: "1M tokens",
    contextWindow: 128000,
    estimated: true,
    manual: false,
    note: "Indicative token rate — confirm the provider's current API price.",
    source,
  };
}

export function formatUsd(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  if (value === 0) return "$0";
  if (value < 0.01) {
    return `$${value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatContext(value: number | null) {
  if (!value) return null;
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
}

export function pricingSummary(pricing: ApiPricingInfo) {
  if (!pricing.available) return "Subscription only";
  if (pricing.output !== null && pricing.unit === "1M tokens") {
    return `${formatUsd(pricing.input)} in / ${formatUsd(pricing.output)} out`;
  }
  return formatUsd(pricing.input);
}
