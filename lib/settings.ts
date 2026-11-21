import type { DB, SiteSettings } from "./types";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  announcementEnabled: false,
  announcementText: "New: 91 mobile apps and 95 desktop tools are now rated on GigleNode.",
  announcementHref: "/#apps",
  heroTitle: "Find the AI that",
  heroHighlight: "actually fits",
  heroSuffix: "your work.",
  heroSubtitle:
    "Video, images, code or writing — compare models, read honest reviews from verified users and choose with confidence. Independent rankings, with paid placements always labelled.",
  allowSignups: true,
  allowRatings: true,
  showPromotions: true,
  hiddenAppSlugs: [],
  adsEnabled: false,
  adsClientId: "",
  adsTopSlot: "",
  adsSidebarSlot: "",
  adsArticleSlot: "",
  supportEmail: "hello@giglenode.com",
  updatedAt: null,
  updatedBy: null,
};

export function getSiteSettings(db: DB): SiteSettings {
  return { ...DEFAULT_SITE_SETTINGS, ...(db.settings ?? {}) };
}
