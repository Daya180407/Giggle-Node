import type { CategorySlug, PriceType } from "../types";

/** Compact catalogue row: name, slug, price, website, domain, blurb, then best-for tags. */
export type CatalogueRow = [
  name: string,
  slug: string,
  price: PriceType,
  website: string,
  domain: string,
  blurb: string,
  ...bestFor: string[],
];

export type CatalogueEntry = {
  name: string;
  slug: string;
  price: PriceType;
  website: string;
  domain: string;
  blurb: string;
  bestFor: string[];
  category: CategorySlug;
};
