import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "writing",
    name: "Writing",
    emoji: "✍️",
    blurb: "Blog, copy, email aur translation ke liye best AI.",
    unit: { key: "words", label: "words / month", defaultQty: 30000 },
  },
  {
    slug: "image",
    name: "Image",
    emoji: "🖼️",
    blurb: "Photo generate, edit aur thumbnail banane ke liye.",
    unit: { key: "images", label: "images / month", defaultQty: 150 },
  },
  {
    slug: "video",
    name: "Video",
    emoji: "🎬",
    blurb: "Text se video, avatar video aur editing ke liye.",
    unit: { key: "videos", label: "videos / month", defaultQty: 20 },
  },
  {
    slug: "coding",
    name: "Coding",
    emoji: "⌨️",
    blurb: "Code likhne, debug karne aur app banane ke liye.",
    unit: { key: "tasks", label: "coding tasks / month", defaultQty: 60 },
  },
  {
    slug: "voice",
    name: "Voice",
    emoji: "🎙️",
    blurb: "Voiceover, dubbing aur audio content ke liye.",
    unit: { key: "audio", label: "minutes of audio / month", defaultQty: 120 },
  },
  {
    slug: "music",
    name: "Music",
    emoji: "🎵",
    blurb: "Songs, background music aur jingles ke liye.",
    unit: { key: "audio", label: "minutes of music / month", defaultQty: 60 },
  },
  {
    slug: "design",
    name: "Design",
    emoji: "🖌️",
    blurb: "Poster, presentation aur UI design ke liye.",
    unit: { key: "images", label: "designs / month", defaultQty: 40 },
  },
  {
    slug: "productivity",
    name: "Productivity",
    emoji: "📊",
    blurb: "Notes, meetings, slides aur research ke liye.",
    unit: { key: "tasks", label: "tasks / month", defaultQty: 80 },
  },
  {
    slug: "education",
    name: "Education",
    emoji: "🎓",
    blurb: "Padhai, practice aur language learning ke liye.",
    unit: { key: "tasks", label: "study sessions / month", defaultQty: 30 },
  },
  {
    slug: "business",
    name: "Business",
    emoji: "💼",
    blurb: "Marketing, sales aur automation ke liye.",
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
