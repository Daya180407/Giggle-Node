import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "writing",
    name: "Writing",
    emoji: "✍️",
    blurb: "The best AI for blogs, copy, email and translation.",
    unit: { key: "words", label: "words / month", defaultQty: 30000 },
  },
  {
    slug: "image",
    name: "Image",
    emoji: "🖼️",
    blurb: "Generate photos, edit visuals and design thumbnails.",
    unit: { key: "images", label: "images / month", defaultQty: 150 },
  },
  {
    slug: "video",
    name: "Video",
    emoji: "🎬",
    blurb: "Text to video, avatar videos and AI editing.",
    unit: { key: "videos", label: "videos / month", defaultQty: 20 },
  },
  {
    slug: "coding",
    name: "Coding",
    emoji: "⌨️",
    blurb: "Write code, debug faster and ship full apps.",
    unit: { key: "tasks", label: "coding tasks / month", defaultQty: 60 },
  },
  {
    slug: "voice",
    name: "Voice",
    emoji: "🎙️",
    blurb: "Voiceovers, dubbing and natural audio.",
    unit: { key: "audio", label: "minutes of audio / month", defaultQty: 120 },
  },
  {
    slug: "music",
    name: "Music",
    emoji: "🎵",
    blurb: "Original songs, background music and jingles.",
    unit: { key: "audio", label: "minutes of music / month", defaultQty: 60 },
  },
  {
    slug: "design",
    name: "Design",
    emoji: "🖌️",
    blurb: "Posters, presentations and interface design.",
    unit: { key: "images", label: "designs / month", defaultQty: 40 },
  },
  {
    slug: "productivity",
    name: "Productivity",
    emoji: "📊",
    blurb: "Notes, meetings, slides and research.",
    unit: { key: "tasks", label: "tasks / month", defaultQty: 80 },
  },
  {
    slug: "research",
    name: "Research & Data",
    emoji: "🔬",
    blurb: "Answers from papers, datasets and spreadsheets.",
    unit: { key: "tasks", label: "research tasks / month", defaultQty: 60 },
  },
  {
    slug: "marketing",
    name: "Marketing & SEO",
    emoji: "📈",
    blurb: "SEO, ads, email and audience growth.",
    unit: { key: "tasks", label: "campaign tasks / month", defaultQty: 80 },
  },
  {
    slug: "education",
    name: "Education",
    emoji: "🎓",
    blurb: "Study smarter, practise more and learn languages.",
    unit: { key: "tasks", label: "study sessions / month", defaultQty: 30 },
  },
  {
    slug: "social",
    name: "Social & Content",
    emoji: "📱",
    blurb: "Clips, captions and social scheduling.",
    unit: { key: "videos", label: "clips / month", defaultQty: 40 },
  },
  {
    slug: "agents",
    name: "AI Agents",
    emoji: "🤖",
    blurb: "Autonomous agents and no-code automation.",
    unit: { key: "tasks", label: "agent runs / month", defaultQty: 100 },
  },
  {
    slug: "business",
    name: "Business & Support",
    emoji: "💼",
    blurb: "Sales, support and customer workflows.",
    unit: { key: "tasks", label: "tasks / month", defaultQty: 50 },
  },
  {
    slug: "specialized",
    name: "Specialized AI",
    emoji: "🧩",
    blurb: "Health, finance, legal, browsers and platform AI.",
    unit: { key: "tasks", label: "tasks / month", defaultQty: 50 },
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

export function categoryName(slug: string): string {
  return CATEGORY_MAP[slug]?.name ?? "All";
}

export const PRICE_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
};

export const POST_TYPE_LABEL: Record<string, string> = {
  news: "News",
  comparison: "Comparison",
  top10: "Top 10",
  tutorial: "Tutorial",
};
