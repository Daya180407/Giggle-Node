export type PriceType = "free" | "freemium" | "paid";

export type CategorySlug =
  | "writing"
  | "image"
  | "video"
  | "coding"
  | "voice"
  | "music"
  | "design"
  | "productivity"
  | "education"
  | "business";

export type Category = {
  slug: CategorySlug;
  name: string;
  emoji: string;
  blurb: string;
  /** cost calculator unit */
  unit: { key: "images" | "videos" | "words" | "audio" | "tasks"; label: string; defaultQty: number };
};

export type Ai = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  color: string;
  website: string;
  category: CategorySlug;
  priceType: PriceType;
  description: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  freeAlternativeId: string | null;
  sponsored: boolean;
  /** manual admin boost, added to the weighted score before sorting */
  boost: number;
  planPrice: number;
  unitCost: number;
  visits: number;
  createdAt: string;
};

export type Model = {
  id: string;
  aiId: string;
  name: string;
  slug: string;
  description: string;
  launchDate: string;
  bestFor: string;
  priceType: PriceType;
};

export type Rating = {
  id: string;
  userId: string;
  modelId: string;
  stars: number;
  review: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
};

export type PostStatus = "draft" | "published";
export type PostType = "news" | "comparison" | "top10" | "tutorial";

export type Post = {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  coverEmoji: string;
  excerpt: string;
  content: string;
  type: PostType;
  relatedAiIds: string[];
  status: PostStatus;
  author: string;
  sponsored: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Prompt = {
  id: string;
  aiId: string;
  title: string;
  promptText: string;
};

export type Bookmark = { id: string; userId: string; aiId: string; createdAt: string };
export type Follow = { id: string; userId: string; aiId: string; createdAt: string };

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin";
  createdAt: string;
  isSeed?: boolean;
  passwordHash?: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
};

export type RateEvent = { ip: string; at: string };
export type AuthEvent = { ip: string; at: string; kind: "login" | "reset" | "signup" };

export type DB = {
  version: number;
  ai: Ai[];
  models: Model[];
  ratings: Rating[];
  posts: Post[];
  prompts: Prompt[];
  bookmarks: Bookmark[];
  follows: Follow[];
  users: User[];
  rateEvents: RateEvent[];
  authEvents: AuthEvent[];
};
