import type { Ai, DB, Model } from "./types";

/**
 * Demo-only ratings built from the November 2026 research & fact-checking
 * leaderboard (Arena Text Factuality ranking, SimpleQA Verified scores).
 *
 * The list is seeded into the catalogue as model rows under each company's AI:
 * rank #1 reads 4.9★ with 5M+ people rated, and the ladder steps down to 4.1★
 * at #50. Models that are not on the leaderboard keep a small demo total below
 * it, so the public ranking follows this list without deleting the existing
 * catalogue.
 *
 * Nothing here creates fake user accounts or rating rows; the aggregate lives
 * in `demoStars` / `demoVotes` and is blended into the weighted score exactly
 * like old votes (see `buildView`). Clear those fields before the site starts
 * relying on real traffic.
 */

type Row = [rank: number, name: string, company: string, factuality: string | null];

const LEADERBOARD: Row[] = [
  [1, "Gemini 4 Carbon", "Google", "77.7%"],
  [2, "Gemini 4 Neon", "Google", null],
  [3, "Claude Opus 5.5", "Anthropic", "72.2%"],
  [4, "Claude Fable 5.1", "Anthropic", "70.8%"],
  [5, "Muse Wonder", "Meta", null],
  [6, "Gemini 4 Hydrogen", "Google", "70.9%"],
  [7, "Claude Opus 4.6", "Anthropic", "47.0%"],
  [8, "Gemini 4 Argon", "Google", "76.0%"],
  [9, "Claude Opus 5", "Anthropic", "59.9%"],
  [10, "MiMo-V2.6-Pro", "Xiaomi", null],
  [11, "GPT-5.5", "OpenAI", "63.0%"],
  [12, "GPT-5.4", "OpenAI", "45.1%"],
  [13, "Claude Fable 5", "Anthropic", "70.7%"],
  [14, "Claude Fable 5.2", "Anthropic", "94.0%"],
  [15, "Muse Spark 1.3", "Meta", null],
  [16, "Qwen3.7 Max", "Alibaba", "55.8%"],
  [17, "Muse Spark 1.2", "Meta", "60.3%"],
  [18, "Kimi K3.1 Pro", "Moonshot AI", "62.2%"],
  [19, "Gemini 3.5 Flash", "Google", "66.2%"],
  [20, "Claude Opus 4.7", "Anthropic", "51.7%"],
  [21, "GPT-5.6 Sol", "OpenAI", "69.7%"],
  [22, "Gemini 3.7 Flash", "Google", "69.2%"],
  [23, "Claude Sonnet 5.5", "Anthropic", "46.5%"],
  [24, "Gemini 3.6 Flash", "Google", "66.2%"],
  [25, "Gemini 3.1 Pro", "Google", "73.5%"],
  [26, "Kimi K3", "Moonshot AI", "50.6%"],
  [27, "Claude Opus 4.8", "Anthropic", "53.0%"],
  [28, "GPT-6.1 Sol", "OpenAI", "73.9%"],
  [29, "GPT-5.6 Terra", "OpenAI", "43.2%"],
  [30, "Gemini 3.8 Flash", "Google", "69.7%"],
  [31, "GLM 5.3", "Z.ai", "41.0%"],
  [32, "Muse Spark", "Meta", null],
  [33, "Gemini 3 Flash", "Google", "66.8%"],
  [34, "GPT-6 Astra", "OpenAI", "75.6%"],
  [35, "DeepSeek V4.1 Flash", "DeepSeek", "42.9%"],
  [36, "GPT-6 Luna", "OpenAI", "41.4%"],
  [37, "Grok 4.5", "xAI", "48.3%"],
  [38, "MiMo V2.5 Pro", "Xiaomi", null],
  [39, "Muse Spark 1.1", "Meta", "57.8%"],
  [40, "GLM 5.2", "Z.ai", "34.2%"],
  [41, "Gemini 2.5 Pro", "Google", null],
  [42, "GLM 5.3 Flash", "Z.ai", null],
  [43, "Claude Sonnet 4.6", "Anthropic", "35.5%"],
  [44, "GPT-5.6 Luna", "OpenAI", "41.0%"],
  [45, "Claude Opus 4.5", "Anthropic", "45.7%"],
  [46, "Kimi K2.6", "Moonshot AI", "34.9%"],
  [47, "GLM-5.1", "Z.ai", "34.0%"],
  [48, "Grok 4.20 (Reasoning)", "xAI", "30.2%"],
  [49, "GPT-6.1 Terra", "OpenAI", "57.3%"],
  [50, "DeepSeek V4 Pro", "DeepSeek", "52.9%"],
];

/** Company -> existing (or newly created) AI slug in the catalogue. */
const COMPANY_AI: Record<string, string> = {
  Google: "gemini",
  Anthropic: "claude",
  OpenAI: "chatgpt",
  Meta: "meta-ai",
  Alibaba: "qwen",
  "Moonshot AI": "kimi",
  xAI: "grok",
  DeepSeek: "deepseek",
  Xiaomi: "mimo",
  "Z.ai": "glm",
};

/** Parent listings that the catalogue did not have before this leaderboard. */
const NEW_AIS: Record<
  string,
  { name: string; logo: string; color: string; website: string; description: string; bestFor: string[] }
> = {
  mimo: {
    name: "MiMo",
    logo: "🟠",
    color: "#FF6900",
    website: "https://mimo.xiaomi.com",
    description:
      "Xiaomi's MiMo model family, built for reasoning, coding and research-heavy assistant work on Mi AI.",
    bestFor: ["Reasoning", "Coding", "Research"],
  },
  glm: {
    name: "GLM",
    logo: "🔷",
    color: "#2563EB",
    website: "https://z.ai",
    description:
      "Z.ai's GLM model family, a low-cost alternative for reasoning, coding and long-document research.",
    bestFor: ["Reasoning", "Coding", "Long documents"],
  },
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureAi(db: DB, slug: string): Ai {
  const found = db.ai.find((ai) => ai.slug === slug);
  if (found) return found;

  const meta = NEW_AIS[slug] ?? {
    name: slug.toUpperCase(),
    logo: "🤖",
    color: "#4F46E5",
    website: `https://${slug}.ai`,
    description: `${slug} model family.`,
    bestFor: ["Research"],
  };

  const ai: Ai = {
    id: `ai_${slug}`,
    name: meta.name,
    slug,
    logo: meta.logo,
    color: meta.color,
    website: meta.website,
    category: "writing",
    priceType: "freemium",
    description: meta.description,
    bestFor: meta.bestFor,
    pros: [
      "Strong reasoning on research and fact-heavy tasks",
      "Free or low-cost entry plan",
      "Long context for reports and documents",
    ],
    cons: [
      "Higher limits need a paid plan",
      "Availability varies by region",
      "Output still needs a human review",
    ],
    freeAlternativeId: null,
    sponsored: false,
    boost: 0,
    planPrice: 0,
    unitCost: 0.002,
    visits: 26_000,
    createdAt: "2025-06-01",
    platforms: ["web"],
  };
  db.ai.push(ai);
  return ai;
}

export function applyDemoRatings(db: DB): boolean {
  if (db.version >= 4) return false;

  const used = new Set<string>();

  LEADERBOARD.forEach(([rank, name, company, factuality]) => {
    const aiSlug = COMPANY_AI[company];
    if (!aiSlug) return;
    const ai = ensureAi(db, aiSlug);

    let model = db.models.find((m) => m.aiId === ai.id && m.name.toLowerCase() === name.toLowerCase());
    if (!model) {
      model = {
        id: `mdl_${ai.slug}_${slugify(name)}`,
        aiId: ai.id,
        name,
        slug: slugify(name),
        description: `${name} from ${company} — ranked #${rank} for research and fact-checking on the November 2026 AI factuality leaderboard${
          factuality ? `, with ${factuality} on SimpleQA Verified` : ""
        }.`,
        launchDate: "2026-09-15",
        bestFor: "Research & fact-checking",
        priceType: ai.priceType,
      } satisfies Model;
      db.models.push(model);
    }
    used.add(model.id);

    // #1 = 4.9★ / 5M+ people rated, #50 = 4.1★ / 25K+.
    const position = (rank - 1) / 49;
    model.demoStars = Math.max(3.9, Math.round((4.9 - position) * 10) / 10);
    model.demoVotes =
      rank === 1
        ? 5_000_000
        : Math.max(25_000, Math.round((5_000_000 * Math.pow(0.005, position)) / 100) * 100);
  });

  // Everything off the leaderboard keeps a smaller demo total below the list,
  // so the public ranking follows the leaderboard instead of the old order.
  const aiVisits = new Map(db.ai.map((ai) => [ai.id, ai.visits]));
  const rest = db.models
    .filter((model) => !used.has(model.id))
    .sort(
      (a, b) =>
        (aiVisits.get(b.aiId) ?? 0) - (aiVisits.get(a.aiId) ?? 0) || a.name.localeCompare(b.name),
    );
  rest.forEach((model, index) => {
    const position = rest.length > 1 ? index / (rest.length - 1) : 0;
    model.demoStars = Math.max(2.9, Math.round((3.8 - 0.9 * position) * 10) / 10);
    model.demoVotes = Math.max(300, Math.round((80_000 * Math.pow(1 - position, 2)) / 100) * 100);
  });

  db.version = 4;
  return true;
}
