import type { CustomPage, DB, MenuItem, SocialLink } from "./types";

export const PAGE_SLUGS = ["about", "contact", "privacy", "terms", "disclaimer"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const PAGE_INFO: Record<PageSlug, { title: string; subtitle: string; label: string }> = {
  about: {
    title: "About us",
    subtitle: "What GigleNode is, how ratings work and why the ranking stays honest.",
    label: "Company",
  },
  contact: {
    title: "Contact",
    subtitle: "Tool listings, data corrections, feature requests and bug reports.",
    label: "Support",
  },
  privacy: {
    title: "Privacy policy",
    subtitle: "What we collect, what is public and how to remove your data.",
    label: "Legal",
  },
  terms: {
    title: "Terms of use",
    subtitle: "The rules for using GigleNode, ratings and sponsored listings.",
    label: "Legal",
  },
  disclaimer: {
    title: "Disclaimer",
    subtitle: "AI information changes fast — how to read our rankings and prices.",
    label: "Legal",
  },
};

export const DEFAULT_SOCIALS: SocialLink[] = [
  { id: "social_instagram", label: "Instagram", href: "https://instagram.com/" },
  { id: "social_youtube", label: "YouTube", href: "https://youtube.com/" },
  { id: "social_x", label: "X", href: "https://x.com/" },
];

export function getCustomPage(db: DB, slug: string): CustomPage | undefined {
  return (db.pages ?? []).find((page) => page.slug === slug);
}

export function customPageIsLive(db: DB, slug: string): CustomPage | null {
  const page = getCustomPage(db, slug);
  return page && page.published && page.body.trim().length > 0 ? page : null;
}

export function menuFor(db: DB, location: MenuItem["location"]): MenuItem[] {
  const saved = db.settings?.menu ?? [];
  return saved.filter((item) => item.location === location && item.visible && item.href.startsWith("/"));
}

export function socialsFor(db: DB): SocialLink[] {
  const saved = db.settings?.socials;
  return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_SOCIALS;
}

export type PageBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "quote"; text: string };

/**
 * Tiny, safe markup for admin-written pages:
 * `## heading`, `### subheading`, `- bullet`, `> quote`, blank line = paragraph.
 * No HTML is evaluated, so a page edit can never inject a script.
 */
export function parsePageBody(body: string): PageBlock[] {
  const blocks: PageBlock[] = [];
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("### ")) blocks.push({ type: "h3", text: line.slice(4) });
    else if (line.startsWith("## ")) blocks.push({ type: "h2", text: line.slice(3) });
    else if (line.startsWith("- ") || line.startsWith("• ")) blocks.push({ type: "li", text: line.slice(2) });
    else if (line.startsWith("> ")) blocks.push({ type: "quote", text: line.slice(2) });
    else blocks.push({ type: "p", text: line });
  }
  return blocks;
}
