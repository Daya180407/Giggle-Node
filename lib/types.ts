import type { AppEntry } from "./apps/types";

export type PriceType = "free" | "freemium" | "paid";

/** Category slugs are dynamic now: admins can add their own, so this is a plain string. */
export type CategorySlug = string;

export type Category = {
  slug: string;
  name: string;
  emoji: string;
  blurb: string;
  /** cost calculator unit */
  unit: { key: "images" | "videos" | "words" | "audio" | "tasks"; label: string; defaultQty: number };
};

/** Where the product actually runs — admin sets these ticks per AI. */
export type Platform = "web" | "android" | "pc";

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
  /** subscription plans shown on the public AI and app listings */
  plans?: SubscriptionPlan[];
  planPrice: number;
  /** price shown in rupees (₹) for Indian visitors */
  planPriceInr?: number;
  unitCost: number;
  visits: number;
  createdAt: string;
  /** hidden tools keep their ratings but disappear from the public site */
  hidden?: boolean;
  /** featured tools get a champion badge and priority placement */
  featured?: boolean;
  platforms?: Platform[];
  /** affiliate URL opened by the public Visit button */
  affiliateUrl?: string | null;
  /** sponsorship bookkeeping: amount paid + the day the paid placement ends */
  sponsorAmount?: number | null;
  sponsorUntil?: string | null;
  /** set when an admin approves a vendor claim for this listing */
  claim?: { vendorName: string; email: string; at: string } | null;
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
  /** pinned models stay on top of the model list regardless of score */
  pin?: boolean;
  /** optional editorial rating shown next to the user score */
  editorRating?: number | null;
  /** admin-entered API price; overrides the curated/estimated rate */
  pricing?: ModelPricing | null;
  /** demo aggregate rating blended into the weighted score like old votes */
  demoStars?: number | null;
  /** demo aggregate vote count shown as "5M+ people rated" */
  demoVotes?: number | null;
};

/** A public subscription plan, edited by admins for an AI or a catalogue app. */
export type SubscriptionPlan = {
  id: string;
  name: string;
  /** USD per month; 0 means a free plan */
  priceMonthly: number;
  priceYearly: number | null;
  /** optional rupee price; falls back to the USD price converted at the site rate */
  priceInr: number | null;
  /** what the plan includes, limits or credits */
  note: string;
};

/** Admin override for a model's API price; replaces the curated/estimated rate. */
export type ModelPricing = {
  available: boolean;
  input: number | null;
  output: number | null;
  unit: string;
  contextWindow: number | null;
  note: string;
  source: string;
};

/** Per-app pricing set from the admin panel. */
export type AppPricing = {
  plans: SubscriptionPlan[];
  /** free-text line such as "From $2.50 / 1M tokens" */
  apiFrom: string;
  apiNote: string;
};

export type PricingReport = {
  id: string;
  targetType: "ai" | "model" | "app";
  targetId: string;
  targetName: string;
  message: string;
  userId: string | null;
  userName: string;
  email: string;
  ip?: string;
  status: "open" | "fixed" | "dismissed";
  createdAt: string;
  resolvedAt?: string | null;
};

export type RatingStatus = "pending" | "approved" | "rejected";

export type Rating = {
  id: string;
  userId: string;
  /** the rated model; null when this row is an AI-level (overall) rating */
  modelId: string | null;
  /** set for an AI-level rating so overall votes stay attached to the tool */
  aiId?: string | null;
  stars: number;
  review: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  /** review moderation state; missing means approved (legacy rows) */
  status?: RatingStatus;
  /** how many visitors reported this review */
  reports?: number;
  /** the reviewer opened this tool from GigleNode before rating it */
  verified?: boolean;
};

/* --------------------------- community & growth --------------------------- */

/** A public submission of a new AI tool, held for admin review. */
export type ToolSubmission = {
  id: string;
  name: string;
  website: string;
  category: CategorySlug;
  priceType: PriceType;
  planPrice: number;
  description: string;
  submitterName: string;
  submitterEmail: string;
  userId: string | null;
  status: "pending" | "approved" | "rejected";
  note: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** catalogue id created when the submission was approved */
  aiId?: string | null;
};

/** Starting-plan price recorded whenever an admin changes it. */
export type PriceSnapshot = {
  id: string;
  aiId: string;
  planPrice: number;
  planPriceInr: number;
  at: string;
};

/** A signed-in user asking to be told when a tool's price changes. */
export type PriceAlert = {
  id: string;
  userId: string;
  aiId: string;
  createdAt: string;
  lastNotifiedAt: string | null;
};

/** Public newsletter subscriber, confirmed through a single-use token link. */
export type NewsletterSubscriber = {
  id: string;
  email: string;
  name: string;
  token: string;
  confirmed: boolean;
  createdAt: string;
  confirmedAt: string | null;
  source: string;
  unsubscribedAt: string | null;
};

/** Vendor request to take ownership of a listing. */
export type ClaimRequest = {
  id: string;
  aiId: string;
  aiName: string;
  vendorName: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

/** Public reply from the claimed vendor under a user review. */
export type ReviewReply = {
  id: string;
  ratingId: string;
  aiId: string;
  vendorName: string;
  email: string;
  body: string;
  createdAt: string;
};

/** One outbound click from a signed-in user — the basis of a verified rating. */
export type AiVisit = { userId: string; aiId: string; at: string };

/**
 * A catalogue addition sent by a signed-in user. Nothing here is public until an
 * admin approves it: plans, models, pricing, new AI listings and new apps all
 * land in the same review queue.
 */
export type ContributionType = "plan" | "model" | "pricing" | "ai" | "app";
export type ContributionStatus = "pending" | "approved" | "rejected";

export type Contribution = {
  id: string;
  type: ContributionType;
  status: ContributionStatus;
  /** existing AI the request belongs to; empty for a new AI or a new app */
  aiId?: string | null;
  aiName?: string;
  title: string;
  website?: string;
  category?: CategorySlug;
  /** app requests only */
  appKind?: "mobile" | "desktop";
  group?: string;
  platforms?: string[];
  priceType?: PriceType;
  /** plan price, or the new starting price for a pricing correction */
  priceMonthly?: number;
  priceYearly?: number | null;
  priceInr?: number | null;
  /** plan limits, model description or the correction details */
  note: string;
  sourceUrl?: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  /** admin feedback for the submitter, also used for rejections */
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  /** slug or id created when the request was approved */
  resultId?: string | null;
};

export type PostStatus = "draft" | "published" | "scheduled";
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
  /** pinned on the homepage hero row */
  featured?: boolean;
  /** publish automatically at this date/time when status is "scheduled" */
  scheduledAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** times the post page was opened (tracked by the public beacon) */
  views?: number;
  /** a complete HTML + CSS file uploaded by an admin; rendered instead of content */
  html?: string | null;
};

export type Prompt = {
  id: string;
  aiId: string;
  title: string;
  promptText: string;
  /** signed-in user who added it; empty for prompts written by the site team */
  submittedBy?: string | null;
  /** name shown as the contributor for community prompts */
  submittedByName?: string;
  /** editorial prompts carry a verified tick; community ones stay unverified */
  verified?: boolean;
  createdAt?: string;
};

export type CommunityMessageKind = "text" | "image" | "voice" | "file";

export type CommunityAttachment = {
  name: string;
  mime: string;
  /** decoded byte size, re-checked on the server before the row is saved */
  size: number;
  /** data URL kept inside the JSON document, like the media library rows */
  dataUrl: string;
};

/**
 * An admin-created room inside an AI's community. The AI's default room is
 * implicit (no row) and lives at /community/<ai-slug>; extra rooms get their own
 * globally unique slug and their messages carry roomId.
 */
export type CommunityRoom = {
  id: string;
  aiId: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  /** hidden rooms disappear from the public index and 404 */
  hidden?: boolean;
};

/** A user who joined a community room; posting needs this row (or a past message). */
export type CommunityMember = {
  id: string;
  userId: string;
  aiId: string;
  /** null/absent = the AI's default room */
  roomId?: string | null;
  joinedAt: string;
};

/** One message in an AI's community room. Expired rows are removed on the next visit. */
export type CommunityMessage = {
  id: string;
  aiId: string;
  /** null/absent = the AI's default room */
  roomId?: string | null;
  userId: string;
  userName: string;
  avatar: string;
  body: string;
  kind: CommunityMessageKind;
  attachment: CommunityAttachment | null;
  createdAt: string;
};

/** Admin controls for the per-AI community rooms. */
export type CommunitySettings = {
  enabled: boolean;
  /** messages older than this many days are deleted automatically */
  retentionDays: number;
  allowText: boolean;
  allowImages: boolean;
  allowVoice: boolean;
  allowFiles: boolean;
  maxMessageLength: number;
  maxPerHour: number;
  /** manual, non-popup ads above the composer and between messages */
  adsEnabled: boolean;
  adTopSlot: string;
  adInlineSlot: string;
  /** an inline ad is shown after this many messages */
  adEvery: number;
  /** house ad shown when no AdSense slot is configured */
  houseAdText: string;
  houseAdHref: string;
};

export type Bookmark = { id: string; userId: string; aiId: string; createdAt: string };
export type Follow = { id: string; userId: string; aiId: string; createdAt: string };

/** Roles are data now: built-in ids plus any custom role an admin creates. */
export type UserRole = string;

export type AdminArea =
  | "posts"
  | "categories"
  | "ratings"
  | "catalogue"
  | "sponsors"
  | "homepage"
  | "users"
  | "pages"
  | "media"
  | "bulk"
  | "gamification"
  | "feedback"
  | "analytics"
  | "notifications"
  | "search"
  | "security"
  | "settings";

export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  /** admin sections this role may open and use */
  areas: AdminArea[];
  /** built-in roles cannot be deleted; admin/user permissions are fixed */
  system?: boolean;
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  createdAt: string;
  isSeed?: boolean;
  banned?: boolean;
  /** trusted reviewer badge */
  verified?: boolean;
  passwordHash?: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
};

export type RateEvent = { ip: string; at: string };
export type AuthEvent = { ip: string; at: string; kind: "login" | "reset" | "signup" };

export type QuizQuestion = { id: "work" | "budget" | "level"; question: string };

export type SearchLog = { q: string; count: number; lastAt: string };

/* -------------------------- notifications & email -------------------------- */

export type PushNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: "system" | "ai" | "post" | "rating";
  audience: "all" | "staff";
  createdAt: string;
  /** user ids that already opened it */
  readBy?: string[];
  auto?: boolean;
};

export type EmailTemplate = { subject: string; body: string };

export type EmailSettings = {
  enabled: boolean;
  welcome: boolean;
  ratingThanks: boolean;
  newsletter: boolean;
  newsletterSubject: string;
  /** supports {{top5}} and {{site}} placeholders */
  newsletterBody: string;
  /** 0 = Sunday … 6 = Saturday */
  newsletterDay: number;
  lastNewsletterAt: string | null;
  templates: { welcome: EmailTemplate; ratingThanks: EmailTemplate };
};

export type EmailMessage = {
  id: string;
  to: string;
  subject: string;
  body: string;
  kind: "welcome" | "rating-thanks" | "newsletter" | "test";
  createdAt: string;
  status: "queued" | "sent" | "failed";
  error?: string;
  sentAt?: string;
};

/* -------------------------------- ai search ------------------------------- */

export type AiSearchProvider = "gemini" | "groq" | "deepseek";

export type AiSearchSettings = {
  enabled: boolean;
  provider: AiSearchProvider;
  /** optional model override; the provider default is used when empty */
  model: string;
  /** stored server-side only, never sent to the browser unmasked */
  apiKey: string;
  dailyLimit: number;
  perMinuteLimit: number;
  cacheEnabled: boolean;
  cacheHours: number;
  prompt: string;
  lastError?: string | null;
  lastCheckedAt?: string | null;
};

export type SearchCacheEntry = {
  normalized: string;
  query: string;
  category: string;
  budget: "free" | "freemium" | "paid" | "any";
  useCase: string;
  mainId: string | null;
  otherIds: string[];
  freeId: string | null;
  source: "llm" | "fallback" | "cache";
  hits: number;
  createdAt: string;
  updatedAt: string;
};

export type SearchAiReport = {
  id: string;
  query: string;
  aiId: string | null;
  aiName: string;
  reason: string;
  userId: string | null;
  createdAt: string;
  status: "open" | "reviewed" | "dismissed";
};

export type SearchRequest = {
  q: string;
  /** sha256 of ip + salt, so raw IPs are not stored for search */
  ipHash: string;
  at: string;
  cached: boolean;
  source: "cache" | "llm" | "fallback" | "limit";
};

/* --------------------------------- media ---------------------------------- */

export type MediaItem = {
  id: string;
  name: string;
  /** data URL or public /path */
  url: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
  uploadedBy: string;
};

/* ------------------------------ pages & menu ------------------------------ */

export type CustomPage = {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  seoDescription: string;
  published: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  location: "header" | "footer";
  visible: boolean;
};

export type SocialLink = { id: string; label: string; href: string };

/* ------------------------------- gamification ------------------------------ */

export type GamificationSettings = {
  enabled: boolean;
  pointsPerRating: number;
  pointsPerReview: number;
  badgeTopReviewer: number;
  badgeExpert: number;
  newUserDays: number;
  topContributorsEnabled: boolean;
  monthlyReset: boolean;
  lastResetAt: string | null;
};

export type PointEvent = { id: string; userId: string; points: number; reason: string; at: string };

/* ---------------------------- spam & security ----------------------------- */

export type SecuritySettings = {
  ipBlockEnabled: boolean;
  /** ratings allowed per IP per 24h before the IP is treated as spam */
  ipRatingThreshold: number;
  blockedIps: string[];
  badWords: string[];
  /** hide the review, or hold the whole rating for moderation */
  badWordAction: "hide" | "pending";
  googleLogin: boolean;
  emailLogin: boolean;
};

/* -------------------------------- analytics ------------------------------- */

export type TrafficSource = { source: string; count: number; lastAt: string };

/* -------------------------------- feedback -------------------------------- */

export type FeedbackKind = "contact" | "feature" | "bug";

export type FeedbackItem = {
  id: string;
  kind: FeedbackKind;
  name: string;
  email: string;
  message: string;
  page?: string;
  screenshot?: string;
  userId?: string | null;
  status: "new" | "approved" | "rejected" | "done";
  createdAt: string;
};

/* ------------------------ appearance & changelog -------------------------- */

export type AppearanceSettings = {
  currency: "INR" | "USD";
  theme: "light" | "dark";
  accent: "indigo" | "cyan" | "emerald" | "rose" | "amber";
  /** uploaded media URL used instead of the default brand mark */
  logoImage: string;
  /** temporary festival logo; wins until festiveLogoUntil */
  festiveLogo: string;
  festiveLogoUntil: string | null;
  /** used when the site currency is USD */
  usdRate: number;
};

export type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  body: string;
  at: string;
  published: boolean;
};

export type SiteSettings = {
  announcementEnabled: boolean;
  announcementText: string;
  announcementHref: string;
  siteName: string;
  logoEmoji: string;
  language: "en" | "hi";
  heroTitle: string;
  heroHighlight: string;
  heroSuffix: string;
  heroSubtitle: string;
  allowSignups: boolean;
  allowRatings: boolean;
  showPromotions: boolean;
  /** new reviews wait for moderator approval before they are public */
  requireReviewApproval: boolean;
  hiddenAppSlugs: string[];
  /** manual homepage trending order (AI ids); empty = automatic */
  trendingAiIds: string[];
  /** manual #1 per category (category slug -> AI id); overrides the formula */
  championOverrides: Record<string, string>;
  /** default tools shown on /compare */
  compareAiIds: string[];
  quizQuestions: QuizQuestion[];
  adsEnabled: boolean;
  adsClientId: string;
  adsTopSlot: string;
  adsSidebarSlot: string;
  adsArticleSlot: string;
  supportEmail: string;
  /** push an in-app notification when a new AI or published post goes live */
  notificationsAuto: boolean;
  community: CommunitySettings;
  email: EmailSettings;
  aiSearch: AiSearchSettings;
  gamification: GamificationSettings;
  security: SecuritySettings;
  appearance: AppearanceSettings;
  socials: SocialLink[];
  menu: MenuItem[];
  changelogEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AdminLogEntry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  detail: string;
  at: string;
};

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
  settings: SiteSettings;
  adminLog: AdminLogEntry[];
  contentLocale?: "en";
  /** admin-managed categories; missing means the built-in list */
  categories?: Category[];
  /** aggregated public search terms */
  searchLogs?: SearchLog[];
  /** last time an admin forced a full ranking recalculation */
  lastRankRecalc?: string | null;
  notifications?: PushNotification[];
  emailOutbox?: EmailMessage[];
  searchCache?: SearchCacheEntry[];
  searchAiReports?: SearchAiReport[];
  searchRequests?: SearchRequest[];
  media?: MediaItem[];
  pages?: CustomPage[];
  traffic?: TrafficSource[];
  feedback?: FeedbackItem[];
  pointEvents?: PointEvent[];
  changelog?: ChangelogEntry[];
  /** app slug -> admin-entered plans and API price note */
  appPricing?: Record<string, AppPricing>;
  /** public reports about wrong plan or API pricing */
  pricingReports?: PricingReport[];
  /** community submissions waiting for (or already through) moderation */
  toolSubmissions?: ToolSubmission[];
  /** starting-plan price snapshots used for the price-drop badge and history */
  priceHistory?: PriceSnapshot[];
  priceAlerts?: PriceAlert[];
  subscribers?: NewsletterSubscriber[];
  claimRequests?: ClaimRequest[];
  reviewReplies?: ReviewReply[];
  /** outbound clicks by signed-in users, used to verify a rating */
  aiVisits?: AiVisit[];
  /** catalogue additions waiting for (or already through) admin review */
  contributions?: Contribution[];
  /** apps and desktop software approved from user requests */
  customApps?: AppEntry[];
  /** admin-managed roles and their permissions */
  roles?: RoleDefinition[];
  /** admin-created extra community rooms; default AI rooms need no row */
  communityRooms?: CommunityRoom[];
  /** per-AI community messages, pruned to the admin retention window */
  communityMessages?: CommunityMessage[];
  /** room memberships; a signed-in user must join before posting */
  communityMembers?: CommunityMember[];
};
