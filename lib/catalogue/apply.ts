import type { Ai, CategorySlug, DB, Model, PriceType, Rating } from "../types";
import { CATALOGUE } from "./index";

/**
 * One-time migration that folds the 2026 catalogue into the existing R2 document.
 * Existing tools keep their editorial copy; only category, price and website are
 * refreshed so the new taxonomy stays accurate.
 */

const CATEGORY_META: Record<
  CategorySlug,
  {
    emoji: string;
    colors: string[];
    unitCost: number;
    pros: [string, string];
    con: string;
  }
> = {
  writing: {
    emoji: "✍️",
    colors: ["#4F46E5", "#7C3AED", "#0EA5E9", "#0891B2", "#D97757"],
    unitCost: 0.003,
    pros: ["Natural, usable written output", "Fits into an everyday writing workflow"],
    con: "Tone and facts still need a human edit",
  },
  coding: {
    emoji: "⌨️",
    colors: ["#0EA5E9", "#2563EB", "#7C3AED", "#0F172A", "#14B8A6"],
    unitCost: 0.02,
    pros: ["Understands real project context", "Speeds up repetitive coding work"],
    con: "Complex changes still need a careful review",
  },
  image: {
    emoji: "🖼️",
    colors: ["#F97316", "#EC4899", "#7C3AED", "#0EA5E9", "#E11D48"],
    unitCost: 0.02,
    pros: ["Strong visual quality and style control", "Fast iteration from a prompt"],
    con: "Fine details and text can still break",
  },
  video: {
    emoji: "🎬",
    colors: ["#EF4444", "#F59E0B", "#8B5CF6", "#0EA5E9", "#111827"],
    unitCost: 0.3,
    pros: ["Covers generation or editing end to end", "Saves shoot and edit time"],
    con: "Renders and revisions add up quickly",
  },
  voice: {
    emoji: "🎙️",
    colors: ["#F43F5E", "#8B5CF6", "#0EA5E9", "#111827", "#14B8A6"],
    unitCost: 0.02,
    pros: ["Natural prosody and clean pronunciation", "Works for narration and conversation"],
    con: "Emotion varies between languages",
  },
  music: {
    emoji: "🎵",
    colors: ["#F59E0B", "#6366F1", "#0F766E", "#EC4899", "#8B5CF6"],
    unitCost: 0.04,
    pros: ["Original music without a studio", "Fast drafts for content and games"],
    con: "Fine mixing control is limited",
  },
  design: {
    emoji: "🖌️",
    colors: ["#A259FF", "#00C4CC", "#F97316", "#0EA5E9", "#111827"],
    unitCost: 0.01,
    pros: ["Drafts inside the design canvas", "Speeds up layouts and brand assets"],
    con: "Brand systems still need manual setup",
  },
  productivity: {
    emoji: "📊",
    colors: ["#7C3AED", "#2563EB", "#0EA5E9", "#059669", "#F59E0B"],
    unitCost: 0.01,
    pros: ["Fits the tools you already use", "Removes repetitive admin work"],
    con: "Best features often need a paid workspace",
  },
  research: {
    emoji: "🔬",
    colors: ["#0891B2", "#4F46E5", "#059669", "#7C3AED", "#0F766E"],
    unitCost: 0.01,
    pros: ["Speeds up source-heavy research", "Keeps citations attached to answers"],
    con: "Results still need verification against the source",
  },
  marketing: {
    emoji: "📈",
    colors: ["#F97316", "#E11D48", "#7C3AED", "#0EA5E9", "#059669"],
    unitCost: 0.01,
    pros: ["Connects content to measurable growth", "Handles repetitive campaign work"],
    con: "Strategy and brand judgement stay human",
  },
  business: {
    emoji: "💼",
    colors: ["#2563EB", "#111827", "#F97316", "#0EA5E9", "#7C3AED"],
    unitCost: 0.01,
    pros: ["Fits team workflows and CRM data", "Cuts response and follow-up time"],
    con: "Setup and onboarding take time",
  },
  education: {
    emoji: "🎓",
    colors: ["#14B8A6", "#58CC02", "#8B5CF6", "#2563EB", "#F59E0B"],
    unitCost: 0.005,
    pros: ["Explains step by step", "Makes practice interactive"],
    con: "Not a replacement for a real teacher",
  },
  social: {
    emoji: "📱",
    colors: ["#EC4899", "#F97316", "#8B5CF6", "#0EA5E9", "#EF4444"],
    unitCost: 0.02,
    pros: ["Turns long content into posts fast", "Keeps captions and formats consistent"],
    con: "Platform rules and reach still change constantly",
  },
  agents: {
    emoji: "🤖",
    colors: ["#111827", "#7C3AED", "#0EA5E9", "#059669", "#F97316"],
    unitCost: 0.03,
    pros: ["Automates multi-step work end to end", "Connects the tools a team already uses"],
    con: "Failures can be harder to debug than a simple script",
  },
  specialized: {
    emoji: "🧩",
    colors: ["#64748B", "#0EA5E9", "#7C3AED", "#059669", "#F59E0B"],
    unitCost: 0.02,
    pros: ["Solves a focused, high-value job", "Saves specialist time on routine work"],
    con: "Expert review is still essential",
  },
};

const FREE_ALT: Partial<Record<CategorySlug, string>> = {
  writing: "chatgpt",
  coding: "codeium",
  image: "stable-diffusion",
  video: "pika",
  voice: "whisper",
  music: "suno",
  design: "penpot-ai",
  productivity: "notion-ai",
  research: "semantic-scholar-ai",
  marketing: "buffer-ai",
  business: "tidio-ai",
  education: "socratic",
  social: "captions-app",
  agents: "n8n-ai",
  specialized: "google-ai-studio",
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function planPriceFor(price: PriceType, seed: number): number {
  if (price === "free") return 0;
  const tiers = price === "paid" ? [15, 19, 25, 29, 39, 49] : [8, 10, 12, 15, 19, 25];
  return tiers[seed % tiers.length];
}

export function applyCatalogue(db: DB): boolean {
  if (db.version >= 2) return false;

  let changed = false;
  const existing = new Map(db.ai.map((ai) => [ai.slug, ai]));
  const seedUsers = db.users.filter((u) => u.isSeed);
  const pool = seedUsers.length ? seedUsers : db.users;

  CATALOGUE.forEach((entry, index) => {
    const current = existing.get(entry.slug);
    if (current) {
      if (current.category !== entry.category) {
        current.category = entry.category;
        changed = true;
      }
      if (current.priceType !== entry.price) {
        current.priceType = entry.price;
        changed = true;
      }
      if (current.website !== entry.website) {
        current.website = entry.website;
        changed = true;
      }
      return;
    }

    const seed = hash(entry.slug);
    const rng = makeRng(seed);
    const meta = CATEGORY_META[entry.category];
    const color = meta.colors[seed % meta.colors.length];
    const quality = 0.73 + (seed % 170) / 1000;
    const popularity = 0.25 + (seed % 700) / 1000;

    const aiId = `ai_${entry.slug}`;
    const ai: Ai = {
      id: aiId,
      name: entry.name,
      slug: entry.slug,
      logo: meta.emoji,
      color,
      website: entry.website,
      category: entry.category,
      priceType: entry.price,
      description: entry.blurb,
      bestFor: entry.bestFor,
      pros: [
        meta.pros[0],
        meta.pros[1],
        entry.price === "free"
          ? "Free to start with no subscription"
          : "Free tier or trial makes it easy to evaluate",
      ],
      cons: [meta.con, "Advanced features sit behind a paid plan", "Output still needs a human review"],
      freeAlternativeId: FREE_ALT[entry.category] ? `ai_${FREE_ALT[entry.category]}` : null,
      sponsored: false,
      boost: 0,
      planPrice: planPriceFor(entry.price, seed),
      unitCost: meta.unitCost,
      visits: Math.round(1500 + popularity * 38000),
      createdAt: daysAgo(420 + (seed % 900)),
    };
    db.ai.push(ai);
    existing.set(ai.slug, ai);

    const modelId = `mdl_${entry.slug}_standard`;
    const model: Model = {
      id: modelId,
      aiId,
      name: "Standard",
      slug: "standard",
      description: `${entry.name}'s main product, rated for ${entry.bestFor.join(", ").toLowerCase()}.`,
      launchDate: ai.createdAt.slice(0, 10),
      bestFor: entry.bestFor[0],
      priceType: entry.price,
    };
    db.models.push(model);

    const voteCount = 10 + (seed % 20);
    const mean = 3.55 + quality * 1.35;
    const start = (index * 13 + seed) % pool.length;
    for (let i = 0; i < voteCount && i < pool.length; i++) {
      const user = pool[(start + i * 7) % pool.length];
      if (!user) continue;
      const stars = Math.min(5, Math.max(1, Math.round(mean + (rng() * 2 - 1) * 0.95)));
      const created = daysAgo(rng() < 0.45 ? rng() * 29 : 30 + rng() * 150);
      const rating: Rating = {
        id: `rt_${entry.slug}_standard_${i}`,
        userId: user.id,
        modelId,
        stars,
        review: null,
        createdAt: created,
        updatedAt: created,
        lastEditedAt: null,
      };
      db.ratings.push(rating);
    }

    changed = true;
  });

  db.version = 2;
  return changed;
}
