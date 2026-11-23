import type { AiStat, View } from "./rank";
import { rankedAis } from "./rank";
import type { CategorySlug } from "./types";

/**
 * Task-first rankings. A category answers "what is the best writing tool?";
 * a use case answers the question a visitor actually types: "what should I use
 * for blog posts / thumbnails / code review?". Each use case is a category plus
 * the words that show up in a tool's own best-for copy, so the list stays
 * explainable: a tool is here because its listing mentions the job.
 */
export type UseCase = {
  slug: string;
  label: string;
  category: CategorySlug;
  emoji: string;
  blurb: string;
  /** lowercase phrases matched against the AI and its models' best-for text */
  keywords: string[];
};

export const USE_CASES: UseCase[] = [
  {
    slug: "blog-writing",
    label: "Blog & long-form writing",
    category: "writing",
    emoji: "✍️",
    blurb: "Draft, outline and edit blog posts, newsletters and long articles.",
    keywords: ["blog", "long writing", "long-form", "article", "content", "newsletter"],
  },
  {
    slug: "seo-content",
    label: "SEO content",
    category: "marketing",
    emoji: "📈",
    blurb: "Keyword-led articles, meta copy and pages built to rank.",
    keywords: ["seo", "keyword", "article", "ranking", "ads", "campaign"],
  },
  {
    slug: "resume-writing",
    label: "Resume & cover letters",
    category: "writing",
    emoji: "📄",
    blurb: "Turn experience into a clear CV, cover letter or LinkedIn profile.",
    keywords: ["resume", "cv", "cover letter", "linkedin", "career", "job"],
  },
  {
    slug: "image-editing",
    label: "Image editing",
    category: "image",
    emoji: "🖼️",
    blurb: "Remove backgrounds, retouch photos and upscale product shots.",
    keywords: ["edit", "background", "photo", "upscale", "retouch", "image"],
  },
  {
    slug: "thumbnail-design",
    label: "Thumbnails & posters",
    category: "design",
    emoji: "🖌️",
    blurb: "Make scroll-stopping thumbnails, posters and social graphics.",
    keywords: ["thumbnail", "poster", "design", "graphic", "social", "presentation"],
  },
  {
    slug: "short-video",
    label: "Short video & reels",
    category: "video",
    emoji: "🎬",
    blurb: "Text-to-video, clips, reels and quick edits for social.",
    keywords: ["video", "clip", "reel", "short", "text-to-video", "avatar"],
  },
  {
    slug: "voiceover",
    label: "Voiceover & dubbing",
    category: "voice",
    emoji: "🎙️",
    blurb: "Natural narration, dubbing and audio for videos and courses.",
    keywords: ["voice", "narration", "dubbing", "audio", "speech", "text-to-speech"],
  },
  {
    slug: "code-review",
    label: "Coding & code review",
    category: "coding",
    emoji: "⌨️",
    blurb: "Write, review and debug code with a model that explains its changes.",
    keywords: ["code", "coding", "debug", "developer", "programming", "review"],
  },
  {
    slug: "app-building",
    label: "App building",
    category: "coding",
    emoji: "🧱",
    blurb: "Ship a full app or prototype from a prompt, then iterate on it.",
    keywords: ["app", "full app", "prototype", "build", "no-code", "developer"],
  },
  {
    slug: "customer-support",
    label: "Customer support",
    category: "business",
    emoji: "💼",
    blurb: "Answer tickets, deflect repeat questions and draft replies.",
    keywords: ["support", "ticket", "chatbot", "customer", "crm", "helpdesk", "sales"],
  },
  {
    slug: "research-papers",
    label: "Research & citations",
    category: "research",
    emoji: "🔬",
    blurb: "Read papers, verify claims and get answers with real sources.",
    keywords: ["research", "citation", "source", "paper", "document", "analysis", "fact"],
  },
  {
    slug: "meeting-notes",
    label: "Meetings & notes",
    category: "productivity",
    emoji: "📝",
    blurb: "Transcribe calls, summarise decisions and turn notes into tasks.",
    keywords: ["meeting", "notes", "transcript", "summary", "summarise", "task"],
  },
  {
    slug: "language-learning",
    label: "Language learning",
    category: "education",
    emoji: "🎓",
    blurb: "Practise conversation, grammar and vocabulary with feedback.",
    keywords: ["language", "learn", "study", "tutor", "student", "practice"],
  },
  {
    slug: "social-captions",
    label: "Social captions",
    category: "social",
    emoji: "📱",
    blurb: "Captions, hooks and post ideas for every platform.",
    keywords: ["caption", "post", "social", "instagram", "schedule", "content"],
  },
  {
    slug: "music-jingles",
    label: "Music & jingles",
    category: "music",
    emoji: "🎵",
    blurb: "Original background music, songs and short brand jingles.",
    keywords: ["music", "song", "jingle", "background", "audio", "beat"],
  },
];

export const USE_CASE_MAP: Record<string, UseCase> = Object.fromEntries(USE_CASES.map((u) => [u.slug, u]));

export function useCaseBySlug(slug: string): UseCase | undefined {
  return USE_CASE_MAP[slug];
}

/** The listing text a use case is matched against. */
function haystack(stat: AiStat): string {
  const { ai, models } = stat;
  return [
    ai.name,
    ai.category,
    ai.description,
    ai.bestFor.join(" "),
    models.map((m) => `${m.model.name} ${m.model.bestFor} ${m.model.description}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/** Which use-case keywords this tool's own listing mentions. */
export function matchReasons(stat: AiStat, useCase: UseCase): string[] {
  const hay = haystack(stat);
  return useCase.keywords.filter((word) => hay.includes(word));
}

export type UseCaseRow = { stat: AiStat; reasons: string[]; matches: boolean };

/**
 * Ranked list for a use case: matching tools first by live score, then the rest
 * of the category so the page is never thin. Matching is shown, not hidden, so
 * a visitor can see why a tool appears.
 */
export function rankUseCase(view: View, useCase: UseCase): UseCaseRow[] {
  const pool = rankedAis(view, useCase.category);
  const rows = pool.map((stat) => {
    const reasons = matchReasons(stat, useCase);
    return { stat, reasons, matches: reasons.length > 0 };
  });
  const matched = rows.filter((row) => row.matches);
  const rest = rows.filter((row) => !row.matches);
  const ordered = matched.length >= 4 ? matched : rows;
  const tail = matched.length >= 4 ? rest : [];
  return [...ordered, ...tail];
}

/** Use cases for the same category, then the busiest neighbours. */
export function relatedUseCases(useCase: UseCase, limit = 6): UseCase[] {
  const same = USE_CASES.filter((u) => u.slug !== useCase.slug && u.category === useCase.category);
  const others = USE_CASES.filter((u) => u.slug !== useCase.slug && u.category !== useCase.category);
  return [...same, ...others].slice(0, limit);
}
