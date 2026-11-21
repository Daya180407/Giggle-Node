import type { PriceType } from "../types";

export type AppKind = "mobile" | "desktop";

export type AppGroup = { key: string; label: string };

/** name, slug, group, price, website, note, AI slug (empty for standalone), platforms */
export type AppRow = [
  name: string,
  slug: string,
  group: string,
  price: PriceType,
  website: string,
  note: string,
  aiSlug: string,
  platforms: string,
];

export type AppEntry = {
  name: string;
  slug: string;
  group: string;
  price: PriceType;
  website: string;
  note: string;
  aiSlug?: string;
  platforms: string[];
  kind: AppKind;
  color: string;
  emoji: string;
};
