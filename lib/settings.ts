import { DEFAULT_PAYMENT_SETTINGS } from "./payments";
import type { DB, SiteSettings } from "./types";

export const AI_SEARCH_PROMPT =
  'You are GiggleNode search assistant. User query: {{query}}. Return ONLY JSON: {"category": "Writing|Coding|Image|Video|Voice|Music|Design|Productivity|Business|Education|Other", "budget": "free|freemium|paid|any", "use_case": "short text"}. Do NOT invent any AI name. Only return category.';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  announcementEnabled: false,
  announcementText: "New: 91 mobile apps and 95 desktop tools are now rated on GiggleNode.",
  announcementHref: "/#apps",
  siteName: "GiggleNode",
  logoEmoji: "🤖",
  language: "en",
  heroTitle: "Find the AI that",
  heroHighlight: "actually fits",
  heroSuffix: "your work.",
  heroSubtitle:
    "Video, images, code or writing — compare models, read honest reviews from verified users and choose with confidence. Independent rankings, with paid placements always labelled.",
  allowSignups: true,
  allowRatings: true,
  showPromotions: true,
  promoAiIds: [],
  promoHeading: "Paid AI picks worth upgrading to",
  promoSubtitle:
    "Tools with real paid plans, promoted by their makers. Placement is labelled and never changes the leaderboard score.",
  requireReviewApproval: false,
  hiddenAppSlugs: [],
  trendingAiIds: [],
  championOverrides: {},
  compareAiIds: [],
  quizQuestions: [
    { id: "work", question: "What do you want the AI to do?" },
    { id: "budget", question: "What is your monthly budget?" },
    { id: "level", question: "How experienced are you with AI tools?" },
  ],
  adsEnabled: false,
  adsClientId: "",
  adsTopSlot: "",
  adsSidebarSlot: "",
  adsArticleSlot: "",
  supportEmail: "hello@gigglenode.com",
  notificationsAuto: true,
  community: {
    enabled: true,
    retentionDays: 30,
    allowText: true,
    allowImages: true,
    allowVoice: true,
    allowFiles: true,
    maxMessageLength: 600,
    maxPerHour: 30,
    adsEnabled: true,
    adTopSlot: "",
    adInlineSlot: "",
    adEvery: 20,
    houseAdText: "Advertise here — reach people comparing AI tools.",
    houseAdHref: "/contact",
  },
  email: {
    enabled: false,
    welcome: true,
    ratingThanks: true,
    newsletter: true,
    newsletterSubject: "Top 5 AI this week on {{site}}",
    newsletterBody:
      "Hi {{name}},\n\nHere are the five highest-ranked AI tools on {{site}} right now:\n\n{{top5}}\n\nEvery rank is built from real user ratings — no payment can buy a place.\n\n— The {{site}} team",
    newsletterDay: 1,
    lastNewsletterAt: null,
    templates: {
      welcome: {
        subject: "Welcome to {{site}}, {{name}}",
        body: "Hi {{name}},\n\nYour {{site}} account is ready. Rate the AI tools you actually use — one honest rating helps every creator pick better.\n\nStart with the live rankings: {{site}}/category/all\n\n— The {{site}} team",
      },
      ratingThanks: {
        subject: "Thanks for rating on {{site}}",
        body: "Hi {{name}},\n\nThanks for rating {{ai}}. Your vote is now part of the weighted ranking.\n\nLeave a written review next time to help other users even more.\n\n— The {{site}} team",
      },
    },
  },
  aiSearch: {
    enabled: true,
    provider: "gemini",
    model: "",
    apiKey: "",
    dailyLimit: 1000,
    perMinuteLimit: 10,
    cacheEnabled: true,
    cacheHours: 24,
    prompt: AI_SEARCH_PROMPT,
    lastError: null,
    lastCheckedAt: null,
  },
  gamification: {
    enabled: true,
    pointsPerRating: 10,
    pointsPerReview: 20,
    badgeTopReviewer: 100,
    badgeExpert: 300,
    newUserDays: 7,
    topContributorsEnabled: true,
    monthlyReset: false,
    lastResetAt: null,
  },
  security: {
    ipBlockEnabled: false,
    ipRatingThreshold: 100,
    blockedIps: [],
    badWords: [],
    badWordAction: "pending",
    googleLogin: false,
    googleClientId: "",
    googleClientSecret: "",
    emailLogin: true,
    magicLink: true,
  },
  appearance: {
    currency: "INR",
    theme: "light",
    accent: "indigo",
    logoImage: "",
    festiveLogo: "",
    festiveLogoUntil: null,
    usdRate: 88,
  },
  payments: DEFAULT_PAYMENT_SETTINGS,
  socials: [],
  menu: [],
  changelogEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

/** Arrays are merged so a saved settings object cannot drop a newer control group. */
export function getSiteSettings(db: DB): SiteSettings {
  const saved = db.settings ?? ({} as Partial<SiteSettings>);
  const email = saved.email ?? DEFAULT_SITE_SETTINGS.email;
  const templates = email.templates ?? DEFAULT_SITE_SETTINGS.email.templates;
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...saved,
    trendingAiIds: saved.trendingAiIds ?? [],
    promoAiIds: saved.promoAiIds ?? [],
    promoHeading: saved.promoHeading || DEFAULT_SITE_SETTINGS.promoHeading,
    promoSubtitle: saved.promoSubtitle || DEFAULT_SITE_SETTINGS.promoSubtitle,
    championOverrides: saved.championOverrides ?? {},
    compareAiIds: saved.compareAiIds ?? [],
    socials: Array.isArray(saved.socials) ? saved.socials : [],
    menu: Array.isArray(saved.menu) ? saved.menu : [],
    email: {
      ...DEFAULT_SITE_SETTINGS.email,
      ...email,
      templates: {
        welcome: { ...DEFAULT_SITE_SETTINGS.email.templates.welcome, ...(templates.welcome ?? {}) },
        ratingThanks: { ...DEFAULT_SITE_SETTINGS.email.templates.ratingThanks, ...(templates.ratingThanks ?? {}) },
      },
    },
    aiSearch: { ...DEFAULT_SITE_SETTINGS.aiSearch, ...(saved.aiSearch ?? {}) },
    gamification: { ...DEFAULT_SITE_SETTINGS.gamification, ...(saved.gamification ?? {}) },
    security: {
      ...DEFAULT_SITE_SETTINGS.security,
      ...(saved.security ?? {}),
      blockedIps: saved.security?.blockedIps ?? [],
      badWords: saved.security?.badWords ?? [],
    },
    appearance: { ...DEFAULT_SITE_SETTINGS.appearance, ...(saved.appearance ?? {}) },
    payments: { ...DEFAULT_PAYMENT_SETTINGS, ...(saved.payments ?? {}) },
    community: { ...DEFAULT_SITE_SETTINGS.community, ...(saved.community ?? {}) },
    quizQuestions: DEFAULT_SITE_SETTINGS.quizQuestions.map(
      (q) => saved.quizQuestions?.find((saved) => saved.id === q.id) ?? q,
    ),
  };
}
