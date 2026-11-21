import type { CategorySlug } from "../types";
import { agents } from "./agents";
import { business } from "./business";
import { coding } from "./coding";
import { design } from "./design";
import { education } from "./education";
import { image } from "./image";
import { marketing } from "./marketing";
import { music } from "./music";
import { productivity } from "./productivity";
import { research } from "./research";
import { social } from "./social";
import { specializedA } from "./specialized-a";
import { specializedB } from "./specialized-b";
import type { CatalogueEntry, CatalogueRow } from "./types";
import { video } from "./video";
import { voice } from "./voice";
import { writing } from "./writing";

const GROUPS: [CategorySlug, CatalogueRow[]][] = [
  ["writing", writing],
  ["coding", coding],
  ["image", image],
  ["video", video],
  ["voice", voice],
  ["music", music],
  ["design", design],
  ["productivity", productivity],
  ["research", research],
  ["marketing", marketing],
  ["business", business],
  ["education", education],
  ["social", social],
  ["agents", agents],
  ["specialized", [...specializedA, ...specializedB]],
];

export const CATALOGUE: CatalogueEntry[] = GROUPS.flatMap(([category, rows]) =>
  rows.map(([name, slug, price, website, domain, blurb, ...bestFor]) => ({
    name,
    slug,
    price,
    website,
    domain,
    blurb,
    bestFor: bestFor.length ? bestFor : [category],
    category,
  })),
);

export const CATALOGUE_BY_SLUG = new Map(CATALOGUE.map((entry) => [entry.slug, entry]));
