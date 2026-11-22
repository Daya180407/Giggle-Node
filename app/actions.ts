"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAction } from "@/lib/admin-log";
import { APP_ENTRIES } from "@/lib/software";
import { activeSubscribers, hasVerifiedUse, recordPriceSnapshot } from "@/lib/community";
import {
  addCommunityMember,
  ATTACHMENT_LIMITS,
  communityKindAllowed,
  isCommunityMember,
  pruneCommunityMessages,
  UNIVERSAL_AI_ID,
  UNIVERSAL_ROOM_ID,
  UNIVERSAL_ROOM_SLUG,
} from "@/lib/community-chat";
import { getCurrentUser, requestIp } from "@/lib/auth";
import { CATEGORIES, getCategories, slugifyCategory } from "@/lib/categories";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { parseCsv } from "@/lib/csv";
import { findBadWord, isBlockedIp, normalizeIpList, normalizeWordList } from "@/lib/guard";
import { deliverEmails, mailerConfigured } from "@/lib/mailer";
import { pushNotification, queueEmail, renderTemplate } from "@/lib/notify";
import { PAGE_SLUGS } from "@/lib/pages";
import { ALL_AREAS, canAccess, isStaffRole, resolveRoles, type AdminArea } from "@/lib/roles";
import { AI_SEARCH_PROMPT, DEFAULT_SITE_SETTINGS, getSiteSettings } from "@/lib/settings";
import { classifyWithProvider, providerHasKey } from "@/lib/ai-search";
import { flushPendingWrites, mutateDb, readDb, uid } from "@/lib/store";
import { buildView, rankedAis } from "@/lib/rank";
import type {
  AiSearchProvider,
  CategorySlug,
  CommunityAttachment,
  CommunityMessageKind,
  CommunityRoom,
  DB,
  FeedbackKind,
  Platform,
  PostStatus,
  PostType,
  PriceType,
  Rating,
  RatingStatus,
  SubscriptionPlan,
  UserRole,
} from "@/lib/types";

export type ActionState = { ok: boolean; error?: string; message?: string };

const MAX_RATINGS_PER_DAY = 20;
const EDIT_LOCK_MS = 24 * 60 * 60 * 1000;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, taken: string[]) {
  let slug = base || "item";
  let i = 2;
  while (taken.includes(slug)) slug = `${base}-${i++}`;
  return slug;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Reads the repeatable plan rows rendered by components/admin/PlanFields. */
function readPlans(formData: FormData): SubscriptionPlan[] {
  const names = formData.getAll("planName").map(String);
  const prices = formData.getAll("planPrice").map(String);
  const pricesInr = formData.getAll("planPriceInr").map(String);
  const yearly = formData.getAll("planYearly").map(String);
  const notes = formData.getAll("planNote").map(String);
  const plans: SubscriptionPlan[] = [];
  const seen = new Set<string>();

  names.forEach((rawName, index) => {
    const name = rawName.trim().slice(0, 40);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const monthly = Math.max(0, Number(prices[index] ?? 0) || 0);
    const monthlyInr = Math.max(0, Number(pricesInr[index] ?? 0) || 0);
    const yearlyPrice = Math.max(0, Number(yearly[index] ?? 0) || 0);
    plans.push({
      id: `plan_${slugify(name)}`,
      name,
      priceMonthly: Math.round(monthly * 100) / 100,
      priceYearly: yearlyPrice > 0 ? Math.round(yearlyPrice * 100) / 100 : null,
      priceInr: monthlyInr > 0 ? Math.round(monthlyInr) : null,
      note: (notes[index] ?? "").trim().slice(0, 140),
    });
  });

  return plans.slice(0, 6);
}

/** Human-readable rating target for admin logs and moderation rows. */
function ratingTarget(db: DB, rating: Rating): string {
  if (rating.modelId) return db.models.find((m) => m.id === rating.modelId)?.name ?? rating.modelId;
  const ai = rating.aiId ? db.ai.find((a) => a.id === rating.aiId) : undefined;
  return ai ? `${ai.name} (overall)` : "Overall rating";
}

/* ------------------------------ ratings ------------------------------ */

export async function rateModelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to submit a rating." };

  // The AI page submits aiId (whole product); a model page submits modelId.
  const aiTargetId = String(formData.get("aiId") ?? "").trim();
  const modelId = String(formData.get("modelId") ?? "").trim();
  const stars = Number(formData.get("stars"));
  const review = String(formData.get("review") ?? "").trim().slice(0, 600);

  if (!aiTargetId && !modelId) return { ok: false, error: "Model not found." };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { ok: false, error: "Please choose a rating between 1 and 5 stars." };
  }

  const db = readDb();
  const settings = getSiteSettings(db);
  if (!settings.allowRatings) {
    return { ok: false, error: "Ratings are temporarily paused by the administrator." };
  }

  const ip = await requestIp();
  const dayAgo = Date.now() - 86400000;
  const ipCount = db.rateEvents.filter((e) => e.ip === ip && +new Date(e.at) > dayAgo).length;
  if (isBlockedIp(settings.security, ip, ipCount)) {
    return { ok: false, error: "This network is blocked from submitting ratings. Contact the site team if this is a mistake." };
  }
  if (ipCount >= MAX_RATINGS_PER_DAY) {
    return { ok: false, error: `This network has reached the limit of ${MAX_RATINGS_PER_DAY} ratings per 24 hours.` };
  }

  const badWord = findBadWord(review, settings.security.badWords);
  const needsApproval =
    review.length > 0 &&
    (settings.requireReviewApproval || (Boolean(badWord) && settings.security.badWordAction === "pending"));
  const ratingStatus: RatingStatus =
    badWord && settings.security.badWordAction === "hide" ? "rejected" : needsApproval ? "pending" : "approved";
  const savedMessage = needsApproval
    ? "Thanks! Your review is waiting for moderator approval."
    : "Rating saved. Thank you!";
  const targetAi = aiTargetId ? db.ai.find((a) => a.id === aiTargetId && !a.hidden) : undefined;
  const model = modelId ? db.models.find((m) => m.id === modelId) : undefined;
  const parent = targetAi ?? (model ? db.ai.find((a) => a.id === model.aiId && !a.hidden) : undefined);
  if (!parent || (!targetAi && !model)) {
    return { ok: false, error: aiTargetId ? "AI not found." : "Model not found." };
  }
  // One rating per user per target: overall ratings never overwrite a model rating.
  const existing = db.ratings.find(
    (r) => r.userId === user.id && (targetAi ? r.aiId === targetAi.id && !r.modelId : r.modelId === modelId),
  );
  const modelPath = targetAi ? `/ai/${parent.slug}` : `/ai/${parent.slug}/${model!.slug}`;
  if (existing) {
    if (existing.lastEditedAt && Date.now() - +new Date(existing.lastEditedAt) < EDIT_LOCK_MS) {
      const hoursLeft = Math.ceil((EDIT_LOCK_MS - (Date.now() - +new Date(existing.lastEditedAt))) / 3600000);
      return {
        ok: false,
        error: `You edited this recently. You can edit again in ${hoursLeft} ${hoursLeft === 1 ? "hour" : "hours"}.`,
      };
    }
    mutateDb((d) => {
      const row = d.ratings.find((r) => r.id === existing.id)!;
      row.stars = stars;
      row.review = review || null;
      row.status = ratingStatus;
      row.verified = parent ? hasVerifiedUse(d, user.id, parent.id) : Boolean(row.verified);
      row.updatedAt = new Date().toISOString();
      row.lastEditedAt = new Date().toISOString();
      d.rateEvents.push({ ip, at: new Date().toISOString() });
    });
    revalidatePath(modelPath);
    revalidatePath("/");
    return { ok: true, message: needsApproval ? savedMessage : "Your rating has been updated." };
  }

  mutateDb((d) => {
    d.ratings.push({
      id: uid("rt"),
      userId: user.id,
      modelId: targetAi ? null : model!.id,
      aiId: targetAi ? targetAi.id : null,
      stars,
      review: review || null,
      status: ratingStatus,
      verified: parent ? hasVerifiedUse(d, user.id, parent.id) : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedAt: null,
    });
    d.rateEvents.push({ ip, at: new Date().toISOString() });
    if (settings.gamification.enabled) {
      if (!Array.isArray(d.pointEvents)) d.pointEvents = [];
      d.pointEvents.push({
        id: uid("pt"),
        userId: user.id,
        points:
          settings.gamification.pointsPerRating + (review.length > 0 ? settings.gamification.pointsPerReview : 0),
        reason: review.length > 0 ? "rating + review" : "rating",
        at: new Date().toISOString(),
      });
      d.pointEvents = d.pointEvents.slice(-1500);
    }
    if (settings.email.enabled && settings.email.ratingThanks) {
      const template = settings.email.templates.ratingThanks;
      queueEmail(d, settings.email, {
        to: user.email,
        kind: "rating-thanks",
        subject: template.subject,
        body: renderTemplate(template.body, {
          name: user.name,
          site: settings.siteName,
          ai: parent?.name ?? "this AI",
        }),
      });
    }
  });
  revalidatePath(modelPath);
  revalidatePath("/");
  return { ok: true, message: savedMessage };
}

/* ------------------------- bookmark / follow ------------------------- */

export async function toggleBookmarkAction(formData: FormData) {
  const user = await getCurrentUser();
  const aiId = String(formData.get("aiId") ?? "");
  const back = String(formData.get("back") ?? "/");
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  mutateDb((db) => {
    const idx = db.bookmarks.findIndex((b) => b.userId === user.id && b.aiId === aiId);
    if (idx >= 0) db.bookmarks.splice(idx, 1);
    else db.bookmarks.push({ id: uid("bm"), userId: user.id, aiId, createdAt: new Date().toISOString() });
  });
  revalidatePath(back);
  redirect(back);
}

export async function toggleFollowAction(formData: FormData) {
  const user = await getCurrentUser();
  const aiId = String(formData.get("aiId") ?? "");
  const back = String(formData.get("back") ?? "/");
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  mutateDb((db) => {
    const idx = db.follows.findIndex((f) => f.userId === user.id && f.aiId === aiId);
    if (idx >= 0) db.follows.splice(idx, 1);
    else db.follows.push({ id: uid("fl"), userId: user.id, aiId, createdAt: new Date().toISOString() });
  });
  revalidatePath(back);
  redirect(back);
}

/* -------------------------------- admin ------------------------------- */

async function assertAdmin(area: AdminArea = "settings") {
  const user = await getCurrentUser();
  const roles = resolveRoles(readDb().roles);
  if (!user || !isStaffRole(user.role, roles)) redirect("/login?next=/admin");
  if (!canAccess(user.role, area, roles)) redirect(`/admin?denied=${area}`);
  return user;
}

export async function saveAiAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  if (!name) redirect("/admin/ai?error=name");
  let savedSlug = slugify(rawSlug || name) || "ai";

  mutateDb((db) => {
    const taken = db.ai.filter((a) => a.id !== id).map((a) => a.slug);
    const slug = uniqueSlug(slugify(rawSlug || name), taken);
    savedSlug = slug;
    const bestFor = String(formData.get("bestFor") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const prosInput = String(formData.get("pros") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
    const consInput = String(formData.get("cons") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
    const websiteRaw = String(formData.get("website") ?? "").trim();
    const affiliateRaw = String(formData.get("affiliateUrl") ?? "").trim();
    const payload = {
      name,
      slug,
      category: String(formData.get("category") ?? "writing") as CategorySlug,
      priceType: String(formData.get("priceType") ?? "freemium") as PriceType,
      // Only http(s) targets: the Visit button redirects to these values.
      website: /^https?:\/\//i.test(websiteRaw) ? websiteRaw : "",
      logo: String(formData.get("logo") ?? "🤖").slice(0, 4) || "🤖",
      color: String(formData.get("color") ?? "#4F46E5"),
      description: String(formData.get("description") ?? "").trim(),
      bestFor,
      pros: prosInput.length
        ? prosInput
        : [
            bestFor[0] ? `Strong output for ${bestFor[0]}` : "Usable output for everyday tasks",
            "You can start on a free or low-cost plan",
            "Simple interface with a short learning curve",
          ],
      cons: consInput.length
        ? consInput
        : [
            "Not 100% accurate on every task",
            "Advanced features sit behind a paid plan",
            "Output still needs a human review",
          ],
      plans: readPlans(formData),
      planPrice: Number(formData.get("startPrice") ?? 0) || 0,
      planPriceInr: Number(formData.get("startPriceInr") ?? 0) || 0,
      unitCost: Number(formData.get("unitCost") ?? 0) || 0,
      platforms: formData
        .getAll("platforms")
        .map(String)
        .filter((p): p is Platform => p === "web" || p === "android" || p === "pc"),
      affiliateUrl: /^https?:\/\//i.test(affiliateRaw) ? affiliateRaw : null,
      hidden: formData.get("hidden") === "on",
      featured: formData.get("featured") === "on",
      freeAlternativeId: String(formData.get("freeAlternativeId") ?? "") || null,
      sponsored: formData.get("sponsored") === "on",
      boost: Number(formData.get("boost") ?? 0) || 0,
    };
    if (id) {
      const ai = db.ai.find((a) => a.id === id);
      if (ai) {
        const beforePrice = Number(ai.planPrice) || 0;
        Object.assign(ai, payload);
        logAdminAction(db, admin, "updated", `AI: ${name}`, `Category: ${payload.category}`);
        if (recordPriceSnapshot(db, ai)) notifyPriceWatchers(db, ai, beforePrice);
      }
    } else {
      db.ai.push({
        id: `ai_${slug}`,
        ...payload,
        visits: 0,
        createdAt: new Date().toISOString(),
      });
      recordPriceSnapshot(db, db.ai[db.ai.length - 1]);
      logAdminAction(db, admin, "created", `AI: ${name}`, `Category: ${payload.category}`);
      if (getSiteSettings(db).notificationsAuto) {
        pushNotification(db, {
          title: `New AI added: ${name}`,
          body: `${name} is now listed under ${payload.category}. Rate it and help the ranking.`,
          href: `/ai/${slug}`,
          kind: "ai",
          auto: true,
        });
      }
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/ai");
  revalidatePath(`/admin/ai/${savedSlug}`);
  redirect(`/admin/ai/${savedSlug}?saved=1`);
}

export async function deleteAiAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const deletedName = db.ai.find((a) => a.id === id)?.name ?? id;
    const modelIds = new Set(db.models.filter((m) => m.aiId === id).map((m) => m.id));
    db.ai = db.ai.filter((a) => a.id !== id);
    db.models = db.models.filter((m) => m.aiId !== id);
    // Overall (AI-level) ratings belong to the tool, so they go with it too.
    db.ratings = db.ratings.filter((r) => r.aiId !== id && (!r.modelId || !modelIds.has(r.modelId)));
    db.prompts = db.prompts.filter((p) => p.aiId !== id);
    db.communityRooms = (db.communityRooms ?? []).filter((room) => room.aiId !== id);
    db.communityMessages = (db.communityMessages ?? []).filter((message) => message.aiId !== id);
    db.communityMembers = (db.communityMembers ?? []).filter((row) => row.aiId !== id);
    db.bookmarks = db.bookmarks.filter((b) => b.aiId !== id);
    db.follows = db.follows.filter((f) => f.aiId !== id);
    db.priceAlerts = (db.priceAlerts ?? []).filter((row) => row.aiId !== id);
    db.priceHistory = (db.priceHistory ?? []).filter((row) => row.aiId !== id);
    db.claimRequests = (db.claimRequests ?? []).filter((row) => row.aiId !== id);
    db.toolSubmissions = (db.toolSubmissions ?? []).filter((row) => row.aiId !== id);
    db.reviewReplies = (db.reviewReplies ?? []).filter((row) => row.aiId !== id);
    db.aiVisits = (db.aiVisits ?? []).filter((row) => row.aiId !== id);
    db.ai.forEach((a) => {
      if (a.freeAlternativeId === id) a.freeAlternativeId = null;
    });
    db.posts.forEach((p) => {
      p.relatedAiIds = p.relatedAiIds.filter((x) => x !== id);
    });
    logAdminAction(db, admin, "deleted", `AI: ${deletedName}`, `${modelIds.size} models and their ratings removed`);
  });
  revalidatePath("/");
  redirect("/admin/ai");
}

export async function saveModelAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const aiId = String(formData.get("aiId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!aiId || !name) redirect(`/admin/ai/${aiId.replace(/^ai_/, "")}?error=fields`);
  let aiSlug = aiId.replace(/^ai_/, "");

  mutateDb((db) => {
    const taken = db.models.filter((m) => m.aiId === aiId && m.id !== id).map((m) => m.slug);
    const useCustomPricing = formData.get("pricingCustom") === "on";
    const payload = {
      aiId,
      name,
      slug: uniqueSlug(slugify(String(formData.get("slug") ?? "") || name), taken),
      description: String(formData.get("description") ?? "").trim(),
      launchDate: String(formData.get("launchDate") ?? "") || new Date().toISOString().slice(0, 10),
      bestFor: String(formData.get("bestFor") ?? "").trim(),
      priceType: String(formData.get("priceType") ?? "freemium") as PriceType,
      pin: formData.get("pin") === "on",
      editorRating: Number(formData.get("editorRating") ?? 0) || null,
      pricing: useCustomPricing
        ? {
            available: formData.get("pricingAvailable") === "on",
            input: optionalNumber(formData.get("pricingInput")),
            output: optionalNumber(formData.get("pricingOutput")),
            unit: String(formData.get("pricingUnit") ?? "1M tokens").slice(0, 20),
            contextWindow: optionalNumber(formData.get("pricingContext")),
            note: String(formData.get("pricingNote") ?? "").trim().slice(0, 200),
            source: String(formData.get("pricingSource") ?? "").trim().slice(0, 300),
          }
        : null,
    };
    const parentAi = db.ai.find((a) => a.id === aiId);
    const aiName = parentAi?.name ?? aiId;
    if (parentAi) aiSlug = parentAi.slug;
    if (id) {
      const model = db.models.find((m) => m.id === id);
      if (model) {
        Object.assign(model, payload);
        logAdminAction(db, admin, "updated", `Model: ${aiName} / ${name}`, `Price: ${payload.priceType}`);
      }
    } else {
      db.models.push({ id: `mdl_${payload.slug}_${Date.now().toString(36)}`, ...payload });
      logAdminAction(db, admin, "created", `Model: ${aiName} / ${name}`, `Price: ${payload.priceType}`);
    }
  });
  revalidatePath("/");
  revalidatePath(`/admin/ai/${aiSlug}`);
  redirect(`/admin/ai/${aiSlug}?saved=1`);
}

export async function deleteModelAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    const modelName = db.models.find((m) => m.id === id)?.name ?? id;
    db.models = db.models.filter((m) => m.id !== id);
    db.ratings = db.ratings.filter((r) => r.modelId !== id);
    logAdminAction(db, admin, "deleted", `Model: ${modelName}`, "Model and its ratings removed");
  });
  revalidatePath("/");
  redirect(`/admin/ai/${aiSlug}`);
}

export async function savePromptAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const aiId = String(formData.get("aiId") ?? "");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const promptText = String(formData.get("promptText") ?? "").trim();
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    if (id) {
      const p = db.prompts.find((x) => x.id === id);
      if (p) {
        p.title = title;
        p.promptText = promptText;
        logAdminAction(db, admin, "updated", `Prompt: ${title}`, `AI id ${aiId}`);
      }
    } else if (title && promptText) {
      // Team-written prompts are the checked ones, so they carry the verified tick.
      db.prompts.push({
        id: uid("pr"),
        aiId,
        title,
        promptText,
        submittedBy: null,
        submittedByName: admin.name,
        verified: true,
        createdAt: new Date().toISOString(),
      });
      logAdminAction(db, admin, "created", `Prompt: ${title}`, `AI id ${aiId}`);
    }
  });
  redirect(`/admin/ai/${aiSlug}`);
}

const MAX_PROMPTS_PER_DAY = 10;

/** Signed-in members can add a prompt to the library; prompts stay free to use. */
export async function submitPromptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to add a prompt." };

  const aiId = String(formData.get("aiId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const promptText = String(formData.get("promptText") ?? "").trim().slice(0, 2000);

  if (title.length < 3) return { ok: false, error: "Please give the prompt a title of at least 3 characters." };
  if (promptText.length < 15) return { ok: false, error: "Please write at least 15 characters of prompt text." };

  const db = readDb();
  const ai = db.ai.find((a) => a.id === aiId && !a.hidden);
  if (!ai) return { ok: false, error: "AI not found." };

  const badWord = findBadWord(`${title} ${promptText}`, getSiteSettings(db).security.badWords);
  if (badWord) return { ok: false, error: "Please remove inappropriate language and try again." };

  const prompts = db.prompts ?? [];
  const duplicate = prompts.find(
    (p) => p.aiId === aiId && p.submittedBy === user.id && p.promptText.toLowerCase() === promptText.toLowerCase(),
  );
  if (duplicate) return { ok: true, message: "This prompt is already in the library." };

  const dayAgo = Date.now() - 86400000;
  const addedToday = prompts.filter(
    (p) => p.submittedBy === user.id && p.createdAt && +new Date(p.createdAt) > dayAgo,
  ).length;
  if (addedToday >= MAX_PROMPTS_PER_DAY) {
    return { ok: false, error: `You can add up to ${MAX_PROMPTS_PER_DAY} prompts per day.` };
  }

  mutateDb((draft) => {
    draft.prompts.push({
      id: uid("pr"),
      aiId,
      title,
      promptText,
      submittedBy: user.id,
      submittedByName: user.name,
      verified: false,
      createdAt: new Date().toISOString(),
    });
  });
  revalidatePath(`/ai/${ai.slug}`);
  revalidatePath("/prompts");
  return { ok: true, message: "Prompt added to the library. Thanks for sharing!" };
}

export async function deletePromptAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    const promptTitle = db.prompts.find((p) => p.id === id)?.title ?? id;
    db.prompts = db.prompts.filter((p) => p.id !== id);
    logAdminAction(db, admin, "deleted", `Prompt: ${promptTitle}`, "Prompt removed");
  });
  redirect(`/admin/ai/${aiSlug}`);
}

/**
 * Prompt library moderation: an admin can give a community prompt the verified
 * tick (or take it away) and remove a prompt straight from the library list.
 */
export async function moderatePromptAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const back = adminBack(formData, "/admin/prompts");
  let aiSlug = "";

  mutateDb((db) => {
    const prompt = db.prompts.find((p) => p.id === id);
    if (!prompt) return;
    aiSlug = db.ai.find((a) => a.id === prompt.aiId)?.slug ?? "";
    if (intent === "delete") {
      db.prompts = db.prompts.filter((p) => p.id !== id);
      logAdminAction(db, admin, "deleted", `Prompt: ${prompt.title}`, "Prompt removed from the library");
      return;
    }
    const verified = intent === "verify";
    prompt.verified = verified;
    logAdminAction(
      db,
      admin,
      verified ? "verified" : "unverified",
      `Prompt: ${prompt.title}`,
      verified ? "Verified tick added" : "Verified tick removed",
    );
  });

  revalidatePath("/prompts");
  revalidatePath("/");
  if (aiSlug) revalidatePath(`/ai/${aiSlug}`);
  revalidatePath(back);
  redirect(back);
}

/* ------------------------------ ai community ------------------------------ */

const MAX_COMMUNITY_ATTACHMENT_NAME = 120;
/** Formats that can execute in a browser are never accepted as community files. */
const UNSAFE_COMMUNITY_MIME = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|application\/javascript|text\/javascript|application\/x-shockwave-flash)/i;

function readCommunityAttachment(
  formData: FormData,
  kind: CommunityMessageKind,
): { attachment: CommunityAttachment } | { error: string } {
  const dataUrl = String(formData.get("attachmentData") ?? "");
  if (!dataUrl.startsWith("data:") || !dataUrl.includes(",")) {
    return { error: kind === "voice" ? "Record a voice note first." : "Choose a file to share first." };
  }

  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)(;base64)?,/i.exec(dataUrl);
  if (!match) return { error: "That attachment could not be read. Try a different file." };
  const mime = match[1].toLowerCase();
  if (UNSAFE_COMMUNITY_MIME.test(mime)) return { error: "This file type cannot be shared in the community." };
  if (kind === "image" && !mime.startsWith("image/")) return { error: "Only image files can be shared as a photo." };
  if (kind === "voice" && !mime.startsWith("audio/")) return { error: "Only audio can be shared as a voice note." };

  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const size = match[2] ? Math.floor(encoded.length * 0.75) : encoded.length;
  const limit = ATTACHMENT_LIMITS[kind as Exclude<CommunityMessageKind, "text">];
  if (size > limit) {
    return { error: `That attachment is too large. Keep it under ${Math.round(limit / 1024)} KB.` };
  }

  const fallbackName = kind === "image" ? "image.jpg" : kind === "voice" ? "voice-note.webm" : "attachment";
  const name = String(formData.get("attachmentName") ?? "").trim().slice(0, MAX_COMMUNITY_ATTACHMENT_NAME) || fallbackName;
  return { attachment: { name, mime, size, dataUrl } };
}

/** Signed-in members can post in any AI room; the admin decides what may be shared. */
export async function postCommunityMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to join the community." };

  const db = readDb();
  const settings = getSiteSettings(db);
  const community = settings.community;
  if (!community.enabled) return { ok: false, error: "The community is paused by the administrator right now." };

  const aiId = String(formData.get("aiId") ?? "").trim();
  const isUniversal = aiId === UNIVERSAL_AI_ID;

  // An admin-created room must exist, belong to this AI and still be public.
  const roomIdRaw = String(formData.get("roomId") ?? "").trim();
  let room: CommunityRoom | null = null;
  if (isUniversal) {
    if (roomIdRaw !== UNIVERSAL_ROOM_ID) return { ok: false, error: "This community room is not available." };
  } else {
    if (!db.ai.some((row) => row.id === aiId && !row.hidden)) return { ok: false, error: "AI not found." };
    if (roomIdRaw) {
      room = (db.communityRooms ?? []).find((row) => row.id === roomIdRaw && row.aiId === aiId && !row.hidden) ?? null;
      if (!room) return { ok: false, error: "This community room is not available." };
    }
  }

  const rawKind = String(formData.get("kind") ?? "text");
  const kind: CommunityMessageKind =
    rawKind === "image" || rawKind === "voice" || rawKind === "file" ? rawKind : "text";
  if (!communityKindAllowed(community, kind)) {
    return { ok: false, error: "The administrator has turned off this kind of post." };
  }

  const body = String(formData.get("body") ?? "").trim().slice(0, community.maxMessageLength);
  let attachment: CommunityAttachment | null = null;
  if (kind !== "text") {
    const parsed = readCommunityAttachment(formData, kind);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    attachment = parsed.attachment;
  }

  const targetRoomId = isUniversal ? UNIVERSAL_ROOM_ID : room?.id ?? null;
  if (!isCommunityMember(db, user.id, isUniversal ? UNIVERSAL_AI_ID : aiId, targetRoomId)) {
    return { ok: false, error: "Join this community before posting a message." };
  }

  if (!body && !attachment) return { ok: false, error: "Write a message or attach something first." };
  if (!body && kind === "text") return { ok: false, error: "Write a message first." };
  if (body && body.length < 2) return { ok: false, error: "Please write a little more than that." };

  const badWord = findBadWord(`${body} ${attachment?.name ?? ""}`, settings.security.badWords);
  if (badWord) return { ok: false, error: "Please remove inappropriate language and try again." };

  const hourAgo = Date.now() - 3600000;
  const recent = (db.communityMessages ?? []).filter(
    (message) => message.userId === user.id && +new Date(message.createdAt) > hourAgo,
  ).length;
  if (recent >= community.maxPerHour) {
    return { ok: false, error: `You can post up to ${community.maxPerHour} messages per hour. Please slow down.` };
  }

  mutateDb((draft) => {
    if (!Array.isArray(draft.communityMessages)) draft.communityMessages = [];
    draft.communityMessages.push({
      id: uid("cm"),
      aiId: isUniversal ? UNIVERSAL_AI_ID : aiId,
      roomId: isUniversal ? UNIVERSAL_ROOM_ID : room?.id ?? null,
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      body,
      kind,
      attachment,
      createdAt: new Date().toISOString(),
    });
    addCommunityMember(draft, user.id, isUniversal ? UNIVERSAL_AI_ID : aiId, targetRoomId);
    pruneCommunityMessages(draft, getSiteSettings(draft).community.retentionDays);
  });

  const targetSlug = isUniversal
    ? UNIVERSAL_ROOM_SLUG
    : room?.slug ?? db.ai.find((row) => row.id === aiId)?.slug ?? "";
  revalidatePath(`/community/${targetSlug}`);
  revalidatePath("/community");
  return { ok: true, message: "Posted. Thanks for helping the community!" };
}

/** Joining a room is required before posting; members are counted per room. */
export async function joinCommunityAction(formData: FormData) {
  const backRaw = String(formData.get("back") ?? "/community");
  const back = backRaw.startsWith("/community") ? backRaw : "/community";
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  const db = readDb();
  const aiId = String(formData.get("aiId") ?? "").trim();
  const roomIdRaw = String(formData.get("roomId") ?? "").trim();
  let roomId: string | null = null;

  if (aiId === UNIVERSAL_AI_ID) {
    if (roomIdRaw !== UNIVERSAL_ROOM_ID) redirect(back);
    roomId = UNIVERSAL_ROOM_ID;
  } else {
    if (!db.ai.some((row) => row.id === aiId && !row.hidden)) redirect(back);
    if (roomIdRaw) {
      const room = (db.communityRooms ?? []).find(
        (row) => row.id === roomIdRaw && row.aiId === aiId && !row.hidden,
      );
      if (!room) redirect(back);
      roomId = room.id;
    }
  }

  mutateDb((draft) => {
    addCommunityMember(draft, user.id, aiId, roomId);
  });
  revalidatePath(back);
  revalidatePath("/community");
  redirect(back);
}

/* --------------------------- community rooms --------------------------- */

/** Admin creates an extra room under any AI; the AI's default room already exists. */
export async function saveCommunityRoomAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const aiId = String(formData.get("aiId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 240);
  if (title.length < 3) redirect("/admin/community?error=title");

  let savedSlug = "";
  mutateDb((db) => {
    const ai = db.ai.find((row) => row.id === aiId);
    if (!ai) return;
    if (!Array.isArray(db.communityRooms)) db.communityRooms = [];
    // A room slug can never shadow an AI slug or another room.
    const taken = new Set([...db.ai.map((row) => row.slug), ...db.communityRooms.map((row) => row.slug)]);
    const base = slugify(title) || "room";
    let slug = base;
    let suffix = 2;
    while (taken.has(slug)) slug = `${base}-${suffix++}`;
    savedSlug = slug;
    db.communityRooms.push({
      id: uid("cr"),
      aiId: ai.id,
      slug,
      title,
      description,
      createdAt: new Date().toISOString(),
      createdBy: admin.name,
    });
    logAdminAction(db, admin, "created", `Community room: ${title}`, `${ai.name} · /community/${slug}`);
  });

  if (!savedSlug) redirect("/admin/community?error=ai");
  revalidatePath("/admin/community");
  revalidatePath("/community");
  revalidatePath(`/community/${savedSlug}`);
  redirect(`/admin/community?saved=${savedSlug}`);
}

export async function toggleCommunityRoomAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const room = (db.communityRooms ?? []).find((row) => row.id === id);
    if (!room) return;
    room.hidden = !room.hidden;
    logAdminAction(
      db,
      admin,
      room.hidden ? "hidden" : "published",
      `Community room: ${room.title}`,
      room.hidden ? "Room hidden from the public index" : "Room published again",
    );
  });
  revalidatePath("/admin/community");
  revalidatePath("/community");
  redirect("/admin/community");
}

export async function deleteCommunityRoomAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const room = (db.communityRooms ?? []).find((row) => row.id === id);
    if (!room) return;
    db.communityRooms = (db.communityRooms ?? []).filter((row) => row.id !== id);
    db.communityMessages = (db.communityMessages ?? []).filter((message) => message.roomId !== id);
    db.communityMembers = (db.communityMembers ?? []).filter((row) => row.roomId !== id);
    logAdminAction(db, admin, "deleted", `Community room: ${room.title}`, "Room and its messages removed");
  });
  revalidatePath("/admin/community");
  revalidatePath("/community");
  redirect("/admin/community");
}

/** Authors can remove their own message; staff can remove any message. */
export async function deleteCommunityMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  const backRaw = String(formData.get("back") ?? "/community");
  const back =
    backRaw.startsWith("/community") || backRaw.startsWith("/admin/community") ? backRaw : "/community";
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  const id = String(formData.get("id") ?? "");
  const db = readDb();
  const message = (db.communityMessages ?? []).find((row) => row.id === id);
  if (!message) redirect(back);

  const staff = isStaffRole(user.role, resolveRoles(db.roles));
  if (message.userId !== user.id && !staff) redirect(back);

  mutateDb((draft) => {
    draft.communityMessages = (draft.communityMessages ?? []).filter((row) => row.id !== id);
    if (message.userId !== user.id) {
      logAdminAction(
        draft,
        user,
        "deleted",
        `Community message: ${message.userName}`,
        `Room ${message.aiId} · ${message.kind}`,
      );
    }
  });
  revalidatePath(back);
  revalidatePath("/community");
  redirect(back);
}

export async function savePostAction(formData: FormData) {
  const admin = await assertAdmin("posts");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/posts?error=title");

  const statusRaw = String(formData.get("status") ?? "draft");
  const parsedStatus: PostStatus =
    statusRaw === "published" || statusRaw === "scheduled" ? statusRaw : "draft";

  mutateDb((db) => {
    const taken = db.posts.filter((p) => p.id !== id).map((p) => p.slug);
    const related = formData
      .getAll("relatedAiIds")
      .flatMap((v) => String(v).split(","))
      .map((s) => s.trim())
      .filter((s) => db.ai.some((a) => a.id === s));
    const payload = {
      title,
      slug: uniqueSlug(slugify(String(formData.get("slug") ?? "") || title), taken),
      excerpt: String(formData.get("excerpt") ?? "").trim(),
      content: String(formData.get("content") ?? ""),
      coverEmoji: String(formData.get("coverEmoji") ?? "📰").slice(0, 4) || "📰",
      coverImage: String(formData.get("coverImage") ?? "").trim(),
      type: String(formData.get("type") ?? "news") as PostType,
      status: parsedStatus,
      relatedAiIds: related,
      sponsored: formData.get("sponsored") === "on",
      featured: formData.get("featured") === "on",
      scheduledAt: String(formData.get("scheduledAt") ?? "").trim() || null,
      seoTitle: String(formData.get("seoTitle") ?? "").trim().slice(0, 70) || null,
      seoDescription: String(formData.get("seoDescription") ?? "").trim().slice(0, 170) || null,
      author: String(formData.get("author") ?? admin.name),
      updatedAt: new Date().toISOString(),
    };
    if (id) {
      const post = db.posts.find((p) => p.id === id);
      if (post) {
        Object.assign(post, payload);
        logAdminAction(db, admin, "updated", `Post: ${title}`, `Status: ${payload.status}`);
      }
    } else {
      db.posts.push({
        id: uid("post"),
        ...payload,
        createdAt: new Date().toISOString(),
      });
      logAdminAction(db, admin, "created", `Post: ${title}`, `Status: ${payload.status}`);
      if (payload.status === "published" && getSiteSettings(db).notificationsAuto) {
        pushNotification(db, {
          title: `New guide: ${title}`,
          body: payload.excerpt || "A new guide is live on GigleNode.",
          href: `/blog/${payload.slug}`,
          kind: "post",
          auto: true,
        });
      }
    }
  });
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData) {
  const admin = await assertAdmin("posts");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const title = db.posts.find((p) => p.id === id)?.title ?? id;
    db.posts = db.posts.filter((p) => p.id !== id);
    logAdminAction(db, admin, "deleted", `Post: ${title}`, "Post removed");
  });
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function deleteRatingAction(formData: FormData) {
  const admin = await assertAdmin("ratings");
  const id = String(formData.get("id") ?? "");
  const backRaw = String(formData.get("back") ?? "/admin/ratings");
  const back = backRaw.startsWith("/admin/") ? backRaw : "/admin/ratings";
  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    const target = rating ? ratingTarget(db, rating) : undefined;
    db.ratings = db.ratings.filter((r) => r.id !== id);
    logAdminAction(db, admin, "deleted", `Rating: ${target ?? id}`, `${rating?.stars ?? "?"}★ removed`);
  });
  revalidatePath(back);
  redirect(back);
}

export async function toggleRoleAction(formData: FormData) {
  const admin = await assertAdmin("users");
  // Role changes are super-admin only, same rule as the access editor on the user page.
  if (admin.role !== "admin") redirect("/admin/users?error=roles");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (u && u.id !== admin.id) {
      u.role = u.role === "admin" ? "user" : "admin";
      logAdminAction(db, admin, "role changed", `User: ${u.email}`, `New role: ${u.role}`);
    }
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setSponsoredAction(formData: FormData) {
  const admin = await assertAdmin("sponsors");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (ai) {
      ai.sponsored = !ai.sponsored;
      logAdminAction(db, admin, ai.sponsored ? "sponsored on" : "sponsored off", `AI: ${ai.name}`, "Sponsored label updated");
    }
  });
  revalidatePath("/");
  redirect("/admin/sponsors");
}

export async function setBoostAction(formData: FormData) {
  const admin = await assertAdmin("sponsors");
  const id = String(formData.get("id") ?? "");
  const boost = Number(formData.get("boost") ?? 0);
  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (ai) {
      ai.boost = Number.isFinite(boost) ? Math.min(1, Math.max(0, boost)) : 0;
      logAdminAction(db, admin, "boost set", `AI: ${ai.name}`, `Boost ${ai.boost.toFixed(2)}`);
    }
  });
  revalidatePath("/");
  redirect("/admin/sponsors");
}

/* --------------------------- site settings --------------------------- */

export async function saveSettingsAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const supportEmail = String(formData.get("supportEmail") ?? "").trim().slice(0, 120);
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    redirect("/admin/settings?error=email");
  }

  const siteName = String(formData.get("siteName") ?? "").trim().slice(0, 40) || "GigleNode";
  const logoEmoji = String(formData.get("logoEmoji") ?? "🤖").slice(0, 4).trim() || "🤖";
  const language: "en" | "hi" = String(formData.get("language") ?? "en") === "hi" ? "hi" : "en";

  const adsEnabled = formData.get("adsEnabled") === "on";
  const rawAdClient = String(formData.get("adsClientId") ?? "").trim();
  const adClientMatch = rawAdClient.match(/(?:ca-)?pub-(\d{16})/i);
  if (rawAdClient && !adClientMatch) redirect("/admin/settings?error=ads");
  const adsClientId = adClientMatch ? `ca-pub-${adClientMatch[1]}` : "";
  if (adsEnabled && !adsClientId) redirect("/admin/settings?error=ads");
  const adSlot = (key: string) => String(formData.get(key) ?? "").replace(/\D/g, "").slice(0, 20);
  const adsTopSlot = adSlot("adsTopSlot");
  const adsSidebarSlot = adSlot("adsSidebarSlot");
  const adsArticleSlot = adSlot("adsArticleSlot");

  const intField = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(formData.get(key));
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  };
  const previousSettings = getSiteSettings(readDb());
  const communityHrefRaw = String(formData.get("communityHouseAdHref") ?? "").trim().slice(0, 200);
  const communityHouseAdHref =
    communityHrefRaw.startsWith("/") || communityHrefRaw.startsWith("https://") ? communityHrefRaw : "";

  let announcementHref = String(formData.get("announcementHref") ?? "").trim().slice(0, 200);
  if (announcementHref && !announcementHref.startsWith("/") && !announcementHref.startsWith("https://")) {
    announcementHref = "/";
  }

  const next = {
    announcementEnabled: formData.get("announcementEnabled") === "on",
    announcementText: String(formData.get("announcementText") ?? "").trim().slice(0, 180),
    announcementHref,
    heroTitle: String(formData.get("heroTitle") ?? "").trim().slice(0, 80) || "Find the AI that",
    heroHighlight: String(formData.get("heroHighlight") ?? "").trim().slice(0, 80) || "actually fits",
    heroSuffix: String(formData.get("heroSuffix") ?? "").trim().slice(0, 80) || "your work.",
    heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim().slice(0, 400),
    allowSignups: formData.get("allowSignups") === "on",
    allowRatings: formData.get("allowRatings") === "on",
    showPromotions: formData.get("showPromotions") === "on",
    requireReviewApproval: formData.get("requireReviewApproval") === "on",
    siteName,
    logoEmoji,
    language,
    adsEnabled,
    adsClientId,
    adsTopSlot,
    adsSidebarSlot,
    adsArticleSlot,
    supportEmail,
    community: {
      enabled: formData.get("communityEnabled") === "on",
      retentionDays: intField("communityRetentionDays", previousSettings.community.retentionDays, 1, 365),
      allowText: formData.get("communityAllowText") === "on",
      allowImages: formData.get("communityAllowImages") === "on",
      allowVoice: formData.get("communityAllowVoice") === "on",
      allowFiles: formData.get("communityAllowFiles") === "on",
      maxMessageLength: intField("communityMaxMessageLength", previousSettings.community.maxMessageLength, 40, 2000),
      maxPerHour: intField("communityMaxPerHour", previousSettings.community.maxPerHour, 1, 200),
      adsEnabled: formData.get("communityAdsEnabled") === "on",
      adTopSlot: adSlot("communityAdTopSlot"),
      adInlineSlot: adSlot("communityAdInlineSlot"),
      adEvery: intField("communityAdEvery", previousSettings.community.adEvery, 3, 50),
      houseAdText: String(formData.get("communityHouseAdText") ?? "").trim().slice(0, 140),
      houseAdHref: communityHouseAdHref,
    },
  };

  mutateDb((db) => {
    db.settings = {
      ...getSiteSettings(db),
      ...next,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      "updated",
      "Site settings",
      `Announcement ${next.announcementEnabled ? "on" : "off"}, signups ${next.allowSignups ? "on" : "off"}, ratings ${next.allowRatings ? "on" : "off"}, promo ${next.showPromotions ? "on" : "off"}, ads ${adsEnabled ? "on" : "off"}, community ${next.community.enabled ? "on" : "off"} (${next.community.retentionDays} day retention)`,
    );
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

/* ------------------------------- users ------------------------------- */

export async function toggleBanAction(formData: FormData) {
  const admin = await assertAdmin("users");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || user.id === admin.id) return;
    user.banned = !user.banned;
    logAdminAction(db, admin, user.banned ? "banned" : "unbanned", `User: ${user.email}`, user.name);
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await assertAdmin("users");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || user.id === admin.id) return;
    db.users = db.users.filter((u) => u.id !== id);
    db.ratings = db.ratings.filter((r) => r.userId !== id);
    db.bookmarks = db.bookmarks.filter((b) => b.userId !== id);
    db.follows = db.follows.filter((f) => f.userId !== id);
    db.communityMessages = (db.communityMessages ?? []).filter((message) => message.userId !== id);
    logAdminAction(db, admin, "deleted", `User: ${user.email}`, `${user.name} and their activity removed`);
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function saveUserProfileAction(formData: FormData) {
  const admin = await assertAdmin("users");
  const id = String(formData.get("id") ?? "");
  const db = readDb();
  const target = db.users.find((u) => u.id === id);
  if (!target) redirect("/admin/users");

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 140);
  const avatar = String(formData.get("avatar") ?? "").trim().slice(0, 4);
  const roleRaw = String(formData.get("role") ?? "user") as UserRole;
  const role = resolveRoles(db.roles).some((row) => row.id === roleRaw) ? roleRaw : "user";
  const newPassword = String(formData.get("newPassword") ?? "");

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/admin/users/${id}?error=fields`);
  }
  if (db.users.some((u) => u.id !== id && u.email.toLowerCase() === email)) {
    redirect(`/admin/users/${id}?error=email`);
  }
  if (newPassword && newPassword.length < 8) redirect(`/admin/users/${id}?error=password`);

  const passwordHash = newPassword ? await hashPassword(newPassword) : null;
  const self = id === admin.id;
  const canManageAccess = admin.role === "admin";

  mutateDb((d) => {
    const user = d.users.find((u) => u.id === id);
    if (!user) return;
    user.name = name;
    user.email = email;
    user.avatar = avatar || name.charAt(0).toUpperCase();
    if (!self && canManageAccess) {
      user.role = role;
      user.verified = formData.get("verified") === "on";
      user.banned = formData.get("banned") === "on";
    }
    if (passwordHash) {
      user.passwordHash = passwordHash;
      delete user.resetTokenHash;
      delete user.resetTokenExpiresAt;
    }
    logAdminAction(
      d,
      admin,
      "user updated",
      `User: ${email}`,
      `${name}${self ? " · self" : ` · ${role}${user.banned ? " · banned" : ""}`}${passwordHash ? " · password reset" : ""}`,
    );
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/profile");
  redirect(`/admin/users/${id}?saved=1`);
}

export async function deleteUserRatingsAction(formData: FormData) {
  const admin = await assertAdmin("users");
  const id = String(formData.get("id") ?? "");
  let removed = 0;
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) return;
    const before = db.ratings.length;
    db.ratings = db.ratings.filter((r) => r.userId !== id);
    removed = before - db.ratings.length;
    logAdminAction(db, admin, "ratings cleared", `User: ${user.email}`, `${removed} ratings removed`);
  });
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/ratings");
  revalidatePath("/");
  redirect(`/admin/users/${id}?removed=${removed}`);
}

/* ------------------------------ ratings ------------------------------ */
export async function updateRatingAction(formData: FormData) {
  const admin = await assertAdmin("ratings");
  const id = String(formData.get("id") ?? "");
  const stars = Number(formData.get("stars"));
  const review = String(formData.get("review") ?? "").trim().slice(0, 600);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) redirect("/admin/ratings?error=stars");

  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    if (!rating) return;
    rating.stars = stars;
    rating.review = review || null;
    rating.updatedAt = new Date().toISOString();
    logAdminAction(
      db,
      admin,
      "edited rating",
      `Rating: ${ratingTarget(db, rating)}`,
      `${stars}★${review ? " with review" : ""}`,
    );
  });
  revalidatePath("/admin/ratings");
  revalidatePath("/");
  redirect("/admin/ratings");
}

/* ------------------------------- posts ------------------------------- */

export async function setPostStatusAction(formData: FormData) {
  const admin = await assertAdmin("posts");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "draft") as PostStatus;
  mutateDb((db) => {
    const post = db.posts.find((p) => p.id === id);
    if (!post) return;
    post.status = status === "published" ? "published" : "draft";
    post.updatedAt = new Date().toISOString();
    logAdminAction(db, admin, post.status === "published" ? "published" : "unpublished", `Post: ${post.title}`, post.slug);
    if (post.status === "published" && getSiteSettings(db).notificationsAuto) {
      pushNotification(db, {
        title: `New guide: ${post.title}`,
        body: post.excerpt || "A new guide is live on GigleNode.",
        href: `/blog/${post.slug}`,
        kind: "post",
        auto: true,
      });
    }
  });
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function toggleAppVisibilityAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const slug = String(formData.get("slug") ?? "");
  const app = APP_ENTRIES.find((entry) => entry.slug === slug);
  if (!app) redirect("/admin/apps");

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const hidden = new Set(settings.hiddenAppSlugs ?? []);
    if (hidden.has(slug)) hidden.delete(slug);
    else hidden.add(slug);
    db.settings = {
      ...settings,
      hiddenAppSlugs: [...hidden],
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      hidden.has(slug) ? "hid app" : "showed app",
      `${app.kind === "mobile" ? "Mobile" : "PC"}: ${app.name}`,
      hidden.has(slug) ? "Removed from public showcase" : "Restored to public showcase",
    );
  });
  revalidatePath("/");
  revalidatePath("/admin/apps");
  redirect("/admin/apps");
}

export async function saveAppPricingAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const slug = String(formData.get("slug") ?? "");
  const app = APP_ENTRIES.find((entry) => entry.slug === slug);
  if (!app) redirect("/admin/apps");

  const plans = readPlans(formData);
  const apiFrom = String(formData.get("apiFrom") ?? "").trim().slice(0, 90);
  const apiNote = String(formData.get("apiNote") ?? "").trim().slice(0, 180);

  mutateDb((db) => {
    if (!db.appPricing) db.appPricing = {};
    db.appPricing[slug] = { plans, apiFrom, apiNote };
    logAdminAction(
      db,
      admin,
      "app pricing updated",
      `${app.kind === "mobile" ? "Mobile" : "PC"}: ${app.name}`,
      `${plans.length} plans${apiFrom ? ` · ${apiFrom}` : ""}`,
    );
  });

  revalidatePath("/");
  revalidatePath("/admin/apps");
  revalidatePath(`/admin/apps/${slug}`);
  redirect(`/admin/apps/${slug}?saved=1`);
}

export async function duplicatePostAction(formData: FormData) {
  const admin = await assertAdmin("posts");
  const id = String(formData.get("id") ?? "");
  const newId = uid("post");
  let created = false;
  mutateDb((db) => {
    const post = db.posts.find((p) => p.id === id);
    if (!post) return;
    let slug = `${post.slug}-copy`;
    let i = 2;
    while (db.posts.some((p) => p.slug === slug)) slug = `${post.slug}-copy-${i++}`;
    const now = new Date().toISOString();
    db.posts.push({
      ...post,
      id: newId,
      title: `${post.title} (Copy)`,
      slug,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    logAdminAction(db, admin, "duplicated", `Post: ${post.title}`, `New draft ${slug}`);
    created = true;
  });
  revalidatePath("/admin/posts");
  redirect(created ? `/admin/posts/${newId}` : "/admin/posts");
}

/* ------------------------- visibility & featured ------------------------- */

function adminBack(formData: FormData, fallback: string) {
  const raw = String(formData.get("back") ?? "");
  return raw.startsWith("/admin") ? raw : fallback;
}

export async function toggleAiFlagAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const back = adminBack(formData, "/admin/ai");

  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (!ai) return;
    if (flag === "hidden") {
      ai.hidden = !ai.hidden;
      logAdminAction(
        db,
        admin,
        ai.hidden ? "hid AI" : "restored AI",
        `AI: ${ai.name}`,
        ai.hidden ? "Removed from public site, ratings kept" : "Visible on the public site again",
      );
    } else if (flag === "featured") {
      ai.featured = !ai.featured;
      logAdminAction(db, admin, ai.featured ? "featured" : "unfeatured", `AI: ${ai.name}`, "Homepage feature flag");
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/ai");
  redirect(back);
}

/* ---------------------------- sponsorships ---------------------------- */

export async function saveSponsorshipAction(formData: FormData) {
  const admin = await assertAdmin("sponsors");
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("sponsorAmount") ?? 0);
  const days = Number(formData.get("sponsorDays") ?? 0);
  const affiliateRaw = String(formData.get("affiliateUrl") ?? "").trim();
  const sponsored = formData.get("sponsored") === "on";
  const clearEnd = formData.get("clearEnd") === "on";

  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (!ai) return;
    ai.sponsored = sponsored;
    ai.sponsorAmount = Number.isFinite(amount) && amount > 0 ? amount : null;
    ai.affiliateUrl = affiliateRaw && /^https?:\/\//.test(affiliateRaw) ? affiliateRaw : null;
    if (clearEnd) {
      ai.sponsorUntil = null;
    } else if (Number.isFinite(days) && days > 0) {
      ai.sponsorUntil = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    }
    logAdminAction(
      db,
      admin,
      sponsored ? "sponsorship on" : "sponsorship off",
      `AI: ${ai.name}`,
      `${ai.sponsorAmount ? `₹${ai.sponsorAmount}` : "no amount"}${ai.sponsorUntil ? ` until ${ai.sponsorUntil}` : ""}${ai.affiliateUrl ? " · affiliate set" : ""}`,
    );
  });
  revalidatePath("/");
  revalidatePath("/admin/sponsors");
  redirect("/admin/sponsors?saved=1");
}

/* ------------------------ rating moderation ------------------------ */

export async function setRatingStatusAction(formData: FormData) {
  const admin = await assertAdmin("ratings");
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "") as RatingStatus;
  if (next !== "approved" && next !== "rejected" && next !== "pending") redirect("/admin/ratings");
  const back = adminBack(formData, "/admin/ratings");

  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    if (!rating) return;
    rating.status = next;
    rating.updatedAt = new Date().toISOString();
    logAdminAction(db, admin, `review ${next}`, `Rating: ${ratingTarget(db, rating)}`, `${rating.stars}★ by ${rating.userId}`);
  });
  revalidatePath(back);
  revalidatePath("/");
  redirect(back);
}

export async function clearRatingReportsAction(formData: FormData) {
  const admin = await assertAdmin("ratings");
  const id = String(formData.get("id") ?? "");
  const back = adminBack(formData, "/admin/ratings?reports=1");
  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    if (!rating) return;
    rating.reports = 0;
    logAdminAction(db, admin, "cleared reports", "Review", rating.review?.slice(0, 60) ?? rating.id);
  });
  revalidatePath(back);
  redirect(back);
}

export async function recalculateRankingAction() {
  const admin = await assertAdmin("ratings");
  const at = new Date().toISOString();
  mutateDb((db) => {
    db.lastRankRecalc = at;
    logAdminAction(db, admin, "recalculated", "Ranking", "Weighted scores rebuilt from all current ratings");
  });
  revalidatePath("/");
  revalidatePath("/category/all");
  revalidatePath("/admin");
  redirect("/admin?recalculated=1");
}

/** Public: a signed-in visitor flags a review for moderators. */
export async function reportRatingAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/");
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    if (!rating || rating.userId === user.id) return;
    rating.reports = (rating.reports ?? 0) + 1;
  });
  revalidatePath(back);
  redirect(back);
}

/* ------------------------------- users ------------------------------- */

export async function setUserAccessAction(formData: FormData) {
  const admin = await assertAdmin("users");
  if (admin.role !== "admin") redirect("/admin/users?error=roles");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "user") as UserRole;
  const verified = formData.get("verified") === "on";
  if (!resolveRoles(readDb().roles).some((row) => row.id === role)) redirect("/admin/users");

  mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || user.id === admin.id) return;
    user.role = role;
    user.verified = verified;
    logAdminAction(db, admin, "access updated", `User: ${user.email}`, `Role ${role}${verified ? " · verified" : ""}`);
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/* --------------------------- roles & permissions --------------------------- */

export async function saveRoleAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") redirect("/admin?denied=roles");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const requested = formData.getAll("areas").map(String);
  const areas = ALL_AREAS.filter((area) => requested.includes(area));
  if (!name) redirect("/admin/roles?error=name");

  mutateDb((db) => {
    const roles = resolveRoles(db.roles);
    if (id) {
      const role = roles.find((row) => row.id === id);
      if (!role) return;
      role.name = name;
      role.description = description;
      if (id === "admin") role.areas = [...ALL_AREAS];
      else if (id === "user") role.areas = [];
      else role.areas = areas;
      db.roles = roles;
      logAdminAction(db, admin, "role updated", `Role: ${name}`, `${role.areas.length} sections`);
      return;
    }

    const base = `role_${slugify(name) || "custom"}`;
    let roleId = base;
    let i = 2;
    while (roles.some((row) => row.id === roleId)) roleId = `${base}_${i++}`;
    roles.push({
      id: roleId,
      name,
      description,
      areas,
      createdAt: new Date().toISOString(),
    });
    db.roles = roles;
    logAdminAction(db, admin, "role created", `Role: ${name}`, `${areas.length} sections`);
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect("/admin/roles?saved=1");
}

export async function deleteRoleAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") redirect("/admin?denied=roles");
  const id = String(formData.get("id") ?? "");
  if (!id || ["admin", "editor", "moderator", "user"].includes(id)) {
    redirect("/admin/roles?error=system");
  }

  mutateDb((db) => {
    const role = resolveRoles(db.roles).find((row) => row.id === id);
    if (!role) return;
    db.roles = resolveRoles(db.roles).filter((row) => row.id !== id);
    let moved = 0;
    for (const user of db.users) {
      if (user.role === id) {
        user.role = "user";
        moved += 1;
      }
    }
    logAdminAction(db, admin, "role deleted", `Role: ${role.name}`, `${moved} users moved to User`);
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect("/admin/roles?saved=1");
}

/* ----------------------------- categories ----------------------------- */

const UNIT_KEYS = ["images", "videos", "words", "audio", "tasks"] as const;

export async function saveCategoryAction(formData: FormData) {
  const admin = await assertAdmin("categories");
  const originalSlug = String(formData.get("originalSlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) redirect("/admin/categories?error=name");
  const slug = slugifyCategory(String(formData.get("slug") ?? "") || name);
  if (!slug) redirect("/admin/categories?error=name");
  const emoji = String(formData.get("emoji") ?? "✨").slice(0, 4).trim() || "✨";
  const blurb = String(formData.get("blurb") ?? "").trim().slice(0, 160);
  const unitKeyRaw = String(formData.get("unitKey") ?? "tasks");
  const unitKey = (UNIT_KEYS as readonly string[]).includes(unitKeyRaw)
    ? (unitKeyRaw as (typeof UNIT_KEYS)[number])
    : "tasks";
  const unitLabel = String(formData.get("unitLabel") ?? "tasks / month").trim().slice(0, 40) || "tasks / month";
  const defaultQty = Number(formData.get("defaultQty") ?? 50) || 50;

  mutateDb((db) => {
    const list = db.categories && db.categories.length > 0 ? db.categories : [...CATEGORIES];
    const duplicate = list.find((c) => c.slug === slug && c.slug !== originalSlug);
    if (duplicate) return;
    const next = { slug, name, emoji, blurb, unit: { key: unitKey, label: unitLabel, defaultQty } };
    if (originalSlug) {
      const index = list.findIndex((c) => c.slug === originalSlug);
      if (index >= 0) list[index] = next;
      else list.push(next);
      if (originalSlug !== slug) {
        db.ai.forEach((ai) => {
          if (ai.category === originalSlug) ai.category = slug;
        });
      }
      logAdminAction(db, admin, "updated category", `Category: ${name}`, `slug ${slug}`);
    } else {
      list.push(next);
      logAdminAction(db, admin, "created category", `Category: ${name}`, `slug ${slug}`);
    }
    db.categories = list;
  });
  revalidatePath("/");
  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await assertAdmin("categories");
  const slug = String(formData.get("slug") ?? "").trim();
  if (readDb().ai.some((a) => a.category === slug)) redirect("/admin/categories?error=inuse");
  mutateDb((db) => {
    const inUse = db.ai.filter((a) => a.category === slug).length;
    if (inUse > 0) return;
    const list = db.categories && db.categories.length > 0 ? db.categories : [...CATEGORIES];
    const target = list.find((c) => c.slug === slug);
    db.categories = list.filter((c) => c.slug !== slug);
    if (target) logAdminAction(db, admin, "deleted category", `Category: ${target.name}`, `slug ${slug}`);
  });
  revalidatePath("/");
  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=1");
}

/* ----------------------- homepage & quiz controls ----------------------- */

export async function saveHomepageAction(formData: FormData) {
  const admin = await assertAdmin("homepage");

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const knownAi = new Set(db.ai.map((a) => a.id));
    const trending = formData
      .getAll("trendingAiIds")
      .map(String)
      .filter((id) => knownAi.has(id))
      .slice(0, 4);
    const compare = formData
      .getAll("compareAiIds")
      .map(String)
      .filter((id) => knownAi.has(id))
      .slice(0, 3);
    const champions: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("champion_")) continue;
      const id = String(value);
      if (id && knownAi.has(id)) champions[key.slice("champion_".length)] = id;
    }
    const quizQuestions = DEFAULT_SITE_SETTINGS.quizQuestions.map((fallback) => {
      const text = String(formData.get(`quiz_${fallback.id}`) ?? "").trim().slice(0, 140);
      return { id: fallback.id, question: text || fallback.question };
    });

    db.settings = {
      ...settings,
      trendingAiIds: trending,
      compareAiIds: compare,
      championOverrides: champions,
      quizQuestions,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      "updated",
      "Homepage controls",
      `${trending.length} manual trending · ${compare.length} compare picks · ${Object.keys(champions).length} champions`,
    );
  });
  revalidatePath("/");
  revalidatePath("/compare");
  revalidatePath("/finder");
  redirect("/admin/homepage?saved=1");
}

/* --------------------------- admin password --------------------------- */

export async function changePasswordAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) redirect("/admin/settings?error=password-short");
  if (next !== confirm) redirect("/admin/settings?error=password-match");
  if (!(await verifyPassword(current, admin.passwordHash))) redirect("/admin/settings?error=password-current");

  const hash = await hashPassword(next);
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === admin.id);
    if (!user) return;
    user.passwordHash = hash;
    logAdminAction(db, admin, "password changed", `Admin: ${admin.email}`, "Password rotated from the admin panel");
  });
  await flushPendingWrites();
  redirect("/admin/settings?saved=password");
}

/* ==================== 11. notifications & email ==================== */

export async function saveEmailSettingsAction(formData: FormData) {
  const admin = await assertAdmin("notifications");
  const newsletterDay = Number(formData.get("newsletterDay") ?? 1);
  const welcomeSubject = String(formData.get("welcomeSubject") ?? "").trim().slice(0, 140);
  const welcomeBody = String(formData.get("welcomeBody") ?? "").trim().slice(0, 4000);
  const ratingSubject = String(formData.get("ratingSubject") ?? "").trim().slice(0, 140);
  const ratingBody = String(formData.get("ratingBody") ?? "").trim().slice(0, 4000);

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const email = settings.email;
    db.settings = {
      ...settings,
      notificationsAuto: formData.get("notificationsAuto") === "on",
      changelogEnabled: formData.get("changelogEnabled") === "on",
      email: {
        ...email,
        enabled: formData.get("emailEnabled") === "on",
        welcome: formData.get("welcome") === "on",
        ratingThanks: formData.get("ratingThanks") === "on",
        newsletter: formData.get("newsletter") === "on",
        newsletterSubject: String(formData.get("newsletterSubject") ?? "").trim().slice(0, 140) || email.newsletterSubject,
        newsletterBody: String(formData.get("newsletterBody") ?? "").trim().slice(0, 4000) || email.newsletterBody,
        newsletterDay: Number.isInteger(newsletterDay) && newsletterDay >= 0 && newsletterDay <= 6 ? newsletterDay : 1,
        templates: {
          welcome: {
            subject: welcomeSubject || email.templates.welcome.subject,
            body: welcomeBody || email.templates.welcome.body,
          },
          ratingThanks: {
            subject: ratingSubject || email.templates.ratingThanks.subject,
            body: ratingBody || email.templates.ratingThanks.body,
          },
        },
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      "updated",
      "Notification & email settings",
      `Auto push ${formData.get("notificationsAuto") === "on" ? "on" : "off"} · email ${formData.get("emailEnabled") === "on" ? "on" : "off"}`,
    );
  });
  revalidatePath("/notifications");
  redirect("/admin/notifications?saved=email");
}

export async function broadcastNotificationAction(formData: FormData) {
  const admin = await assertAdmin("notifications");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 300);
  const href = String(formData.get("href") ?? "").trim();
  const audience = formData.get("audience") === "staff" ? "staff" : "all";
  if (!title) redirect("/admin/notifications?error=title");

  mutateDb((db) => {
    pushNotification(db, { title, body: body || title, href, kind: "system", audience });
    logAdminAction(db, admin, "sent notification", title, `Audience: ${audience}`);
  });
  revalidatePath("/notifications");
  redirect("/admin/notifications?saved=broadcast");
}

export async function deleteNotificationAction(formData: FormData) {
  const admin = await assertAdmin("notifications");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const target = db.notifications?.find((n) => n.id === id);
    db.notifications = (db.notifications ?? []).filter((n) => n.id !== id);
    if (target) logAdminAction(db, admin, "deleted", `Notification: ${target.title}`, target.kind);
  });
  revalidatePath("/notifications");
  redirect("/admin/notifications?saved=deleted");
}

export async function queueNewsletterAction() {
  const admin = await assertAdmin("notifications");
  const db = readDb();
  const settings = getSiteSettings(db);
  const top = rankedAis(buildView(db)).slice(0, 5);
  if (top.length === 0) redirect("/admin/notifications?error=no-ai");
  const lines = top
    .map((s, i) => `${i + 1}. ${s.ai.name} — ${s.score.toFixed(1)}★ from ${s.votes} votes (${s.ai.priceType})`)
    .join("\n");
  // The outbox keeps 250 rows, so a single manual send is capped below that.
  const recipients = [
    ...db.users.filter((u) => !u.banned).map((u) => ({ email: u.email, name: u.name })),
    ...activeSubscribers(db).map((s) => ({ email: s.email, name: s.name || "there" })),
  ]
    .filter((row, index, all) => all.findIndex((other) => other.email.toLowerCase() === row.email.toLowerCase()) === index)
    .slice(0, 240);

  mutateDb((d) => {
    const current = getSiteSettings(d);
    for (const user of recipients) {
      queueEmail(d, current.email, {
        to: user.email,
        kind: "newsletter",
        subject: renderTemplate(current.email.newsletterSubject, { site: current.siteName, name: user.name }),
        body: renderTemplate(current.email.newsletterBody, {
          site: current.siteName,
          name: user.name,
          top5: lines,
        }),
      });
    }
    d.settings = {
      ...current,
      email: { ...current.email, lastNewsletterAt: new Date().toISOString() },
    };
    logAdminAction(d, admin, "queued newsletter", "Top 5 AI email", `${recipients.length} recipients queued`);
  });
  redirect(`/admin/notifications?saved=newsletter&queued=${recipients.length}`);
}

export async function deliverOutboxAction() {
  const admin = await assertAdmin("notifications");
  if (!mailerConfigured()) redirect("/admin/notifications?saved=queued-only");
  const queued = (readDb().emailOutbox ?? []).filter((m) => m.status === "queued").slice(0, 20);
  if (queued.length === 0) redirect("/admin/notifications?saved=empty");

  const results = await deliverEmails(queued);
  let sent = 0;
  mutateDb((db) => {
    for (const result of results) {
      const row = db.emailOutbox?.find((m) => m.id === result.id);
      if (!row) continue;
      if (result.ok) {
        row.status = "sent";
        row.sentAt = new Date().toISOString();
        sent += 1;
      } else {
        row.status = "failed";
        row.error = (result.error ?? "Delivery failed").slice(0, 220);
      }
    }
    logAdminAction(db, admin, "email delivery", "Outbox", `${sent}/${results.length} delivered`);
  });
  redirect(`/admin/notifications?saved=delivered&sent=${sent}`);
}

export async function queueTestEmailAction(formData: FormData) {
  const admin = await assertAdmin("notifications");
  const to = String(formData.get("to") ?? admin.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) redirect("/admin/notifications?error=email");
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    queueEmail(db, settings.email, {
      to,
      kind: "test",
      subject: `${settings.siteName} test email`,
      body: `This is a test email from the ${settings.siteName} admin panel.\n\nIf you can read this, your email provider is working.`,
    });
    logAdminAction(db, admin, "queued test email", to, "Email delivery test");
  });
  redirect("/admin/notifications?saved=test");
}

export async function deleteEmailAction(formData: FormData) {
  const admin = await assertAdmin("notifications");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    db.emailOutbox = (db.emailOutbox ?? []).filter((m) => m.id !== id);
    logAdminAction(db, admin, "deleted", "Email outbox message", id);
  });
  redirect("/admin/notifications?saved=deleted");
}

/* ======================= 12. AI search control ======================= */

export async function saveAiSearchAction(formData: FormData) {
  const admin = await assertAdmin("search");
  const providerRaw = String(formData.get("provider") ?? "gemini");
  const provider: AiSearchProvider =
    providerRaw === "groq" || providerRaw === "deepseek" ? providerRaw : "gemini";
  const apiKeyInput = String(formData.get("apiKey") ?? "").trim();
  const dailyLimit = Number(formData.get("dailyLimit") ?? 1000);
  const perMinuteLimit = Number(formData.get("perMinuteLimit") ?? 10);
  const cacheHours = Number(formData.get("cacheHours") ?? 24);

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const current = settings.aiSearch;
    const providerChanged = current.provider !== provider;
    db.settings = {
      ...settings,
      aiSearch: {
        ...current,
        enabled: formData.get("enabled") === "on",
        provider,
        model: String(formData.get("model") ?? "").trim().slice(0, 80),
        // Never send the previous provider's key to a different API.
        apiKey: apiKeyInput || (providerChanged ? "" : current.apiKey),
        dailyLimit: Number.isFinite(dailyLimit) ? Math.min(100000, Math.max(1, Math.floor(dailyLimit))) : 1000,
        perMinuteLimit: Number.isFinite(perMinuteLimit)
          ? Math.min(200, Math.max(1, Math.floor(perMinuteLimit)))
          : 10,
        cacheEnabled: formData.get("cacheEnabled") === "on",
        cacheHours: Number.isFinite(cacheHours) ? Math.min(720, Math.max(1, Math.floor(cacheHours))) : 24,
        prompt: String(formData.get("prompt") ?? "").trim().slice(0, 4000) || AI_SEARCH_PROMPT,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      "updated",
      "AI search settings",
      `Provider ${provider} · limit ${dailyLimit}/day · cache ${cacheHours}h`,
    );
  });
  revalidatePath("/search");
  redirect("/admin/search-ai?saved=1");
}

export async function testAiSearchAction() {
  const admin = await assertAdmin("search");
  const db = readDb();
  const settings = getSiteSettings(db).aiSearch;
  if (!providerHasKey(settings)) {
    mutateDb((d) => {
      const current = getSiteSettings(d);
      d.settings = {
        ...current,
        aiSearch: { ...current.aiSearch, lastError: "No API key configured.", lastCheckedAt: new Date().toISOString() },
      };
      logAdminAction(db, admin, "tested", "AI search provider", "Missing API key");
    });
    redirect("/admin/search-ai?tested=missing");
  }

  const result = await classifyWithProvider("which is the best AI for making videos", db, settings);
  mutateDb((d) => {
    const current = getSiteSettings(d);
    d.settings = {
      ...current,
      aiSearch: {
        ...current.aiSearch,
        lastError: result.error,
        lastCheckedAt: new Date().toISOString(),
      },
    };
    logAdminAction(
      db,
      admin,
      "tested",
      "AI search provider",
      result.intent ? `OK · category ${result.intent.category ?? "keyword"}` : result.error ?? "failed",
    );
  });
  redirect(`/admin/search-ai?tested=${result.intent ? "ok" : "failed"}`);
}

export async function clearSearchCacheAction(formData: FormData) {
  const admin = await assertAdmin("search");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const before = db.searchCache?.length ?? 0;
    db.searchCache = id ? (db.searchCache ?? []).filter((row) => row.normalized !== id) : [];
    logAdminAction(db, admin, "cleared", "AI search cache", `${before - (db.searchCache?.length ?? 0)} entries removed`);
  });
  redirect("/admin/search-ai?saved=cache");
}

export async function setSearchReportStatusAction(formData: FormData) {
  const admin = await assertAdmin("search");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "reviewed");
  if (status !== "open" && status !== "reviewed" && status !== "dismissed") redirect("/admin/search-ai");
  mutateDb((db) => {
    const report = db.searchAiReports?.find((row) => row.id === id);
    if (!report) return;
    report.status = status;
    logAdminAction(db, admin, `search report ${status}`, report.query, report.aiName);
  });
  redirect("/admin/search-ai?saved=report");
}

/** Public: a visitor says the AI search suggested the wrong tool. */
export async function reportAiSearchAction(formData: FormData) {
  const user = await getCurrentUser();
  const query = String(formData.get("query") ?? "").trim().slice(0, 200);
  const aiName = String(formData.get("aiName") ?? "").trim().slice(0, 80);
  const aiId = String(formData.get("aiId") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const back = `/search?q=${encodeURIComponent(query)}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (!reason) redirect(`${back}&reported=empty`);

  mutateDb((db) => {
    if (!Array.isArray(db.searchAiReports)) db.searchAiReports = [];
    db.searchAiReports.unshift({
      id: uid("sr"),
      query,
      aiId,
      aiName: aiName || "Not a match",
      reason,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: "open",
    });
    db.searchAiReports = db.searchAiReports.slice(0, 200);
  });
  redirect(`${back}&reported=1`);
}

/* =========================== 13. media =========================== */

export async function saveMediaAction(formData: FormData) {
  const admin = await assertAdmin("media");
  const url = String(formData.get("dataUrl") ?? "").trim();
  const name = String(formData.get("name") ?? "image").trim().slice(0, 80) || "image";
  const mime = String(formData.get("mime") ?? "image/jpeg").slice(0, 60);
  const bytes = Number(formData.get("bytes") ?? 0);
  const width = Number(formData.get("width") ?? 0) || undefined;
  const height = Number(formData.get("height") ?? 0) || undefined;

  if (!url.startsWith("data:image/") && !url.startsWith("/") && !/^https:\/\//.test(url)) {
    redirect("/admin/media?error=file");
  }
  if (url.length > 900000) redirect("/admin/media?error=large");

  mutateDb((db) => {
    if (!Array.isArray(db.media)) db.media = [];
    if (db.media.length >= 80) return;
    db.media.unshift({
      id: uid("media"),
      name,
      url,
      mime,
      bytes: Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes) : Math.round(url.length * 0.75),
      width,
      height,
      createdAt: new Date().toISOString(),
      uploadedBy: admin.name,
    });
    logAdminAction(db, admin, "uploaded", `Media: ${name}`, `${Math.round(url.length / 1024)} KB stored`);
  });
  redirect("/admin/media?saved=1");
}

export async function deleteMediaAction(formData: FormData) {
  const admin = await assertAdmin("media");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const item = db.media?.find((m) => m.id === id);
    db.media = (db.media ?? []).filter((m) => m.id !== id);
    if (item) logAdminAction(db, admin, "deleted", `Media: ${item.name}`, item.mime);
  });
  redirect("/admin/media?saved=deleted");
}

/* ======================== 14. pages, menu, socials ======================== */

export async function savePageAction(formData: FormData) {
  const admin = await assertAdmin("pages");
  const slug = String(formData.get("slug") ?? "");
  if (!(PAGE_SLUGS as readonly string[]).includes(slug)) redirect("/admin/pages?error=slug");
  const title = String(formData.get("title") ?? "").trim().slice(0, 90);
  if (!title) redirect(`/admin/pages?slug=${slug}&error=title`);
  const subtitle = String(formData.get("subtitle") ?? "").trim().slice(0, 220);
  const body = String(formData.get("body") ?? "").slice(0, 20000).trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim().slice(0, 170);

  mutateDb((db) => {
    const page = {
      slug,
      title,
      subtitle,
      body,
      seoDescription,
      published: formData.get("published") === "on",
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    if (!Array.isArray(db.pages)) db.pages = [];
    const index = db.pages.findIndex((row) => row.slug === slug);
    if (index >= 0) db.pages[index] = page;
    else db.pages.push(page);
    logAdminAction(db, admin, "updated", `Page: ${title}`, `/${slug} · ${page.published ? "published" : "draft"}`);
  });
  revalidatePath(`/${slug}`);
  redirect(`/admin/pages?slug=${slug}&saved=1`);
}

export async function saveMenuAction(formData: FormData) {
  const admin = await assertAdmin("pages");
  const ids = formData.getAll("menuId").map(String);
  const labels = formData.getAll("menuLabel").map(String);
  const hrefs = formData.getAll("menuHref").map(String);
  const locations = formData.getAll("menuLocation").map(String);
  const visibleIndexes = new Set(formData.getAll("menuVisible").map(String));

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const items = labels
      .map((label, index) => {
        const href = (hrefs[index] ?? "").trim();
        const clean = label.trim().slice(0, 40);
        if (!clean || !href.startsWith("/")) return null;
        return {
          id: ids[index] || uid("menu"),
          label: clean,
          href: href.slice(0, 160),
          location: locations[index] === "footer" ? ("footer" as const) : ("header" as const),
          visible: visibleIndexes.has(String(index)),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 24);
    db.settings = { ...settings, menu: items, updatedAt: new Date().toISOString(), updatedBy: admin.name };
    logAdminAction(db, admin, "updated", "Menu links", `${items.length} links`);
  });
  revalidatePath("/");
  redirect("/admin/pages?saved=menu");
}

export async function saveSocialsAction(formData: FormData) {
  const admin = await assertAdmin("pages");
  const labels = formData.getAll("socialLabel").map(String);
  const hrefs = formData.getAll("socialHref").map(String);
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const socials = labels
      .map((label, index) => {
        const href = (hrefs[index] ?? "").trim();
        const clean = label.trim().slice(0, 24);
        if (!clean || !/^https?:\/\//.test(href)) return null;
        return { id: uid("social"), label: clean, href: href.slice(0, 200) };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 8);
    db.settings = { ...settings, socials, updatedAt: new Date().toISOString(), updatedBy: admin.name };
    logAdminAction(db, admin, "updated", "Social links", `${socials.length} links`);
  });
  revalidatePath("/");
  redirect("/admin/pages?saved=socials");
}

/* ======================== 15. bulk upload ======================== */

function normalizePriceType(value: string): PriceType | null {
  const raw = value.trim().toLowerCase();
  if (raw === "free" || raw === "paid" || raw === "freemium") return raw;
  return null;
}

export async function bulkUploadAction(formData: FormData) {
  const admin = await assertAdmin("bulk");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/bulk?error=file");
  if (file.size > 3_000_000) redirect("/admin/bulk?error=large");

  const rows = parseCsv(await file.text());
  if (rows.length < 2) redirect("/admin/bulk?error=empty");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);
  const cell = (row: string[], name: string) => {
    const at = index(name);
    return at >= 0 ? (row[at] ?? "").trim() : "";
  };
  const number = (row: string[], name: string) => {
    const value = Number(cell(row, name).replace(/[^0-9.]/g, ""));
    return Number.isFinite(value) ? value : 0;
  };

  let created = 0;
  let skipped = 0;
  mutateDb((db) => {
    const categories = getCategories(db);
    const names = new Set(db.ai.map((ai) => ai.name.trim().toLowerCase()));
    const taken = new Set(db.ai.map((ai) => ai.slug));
    for (const row of rows.slice(1)) {
      const name = cell(row, "name");
      if (!name) {
        skipped += 1;
        continue;
      }
      if (names.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      const rawCategory = cell(row, "category").toLowerCase();
      const category =
        categories.find((c) => c.slug === rawCategory || c.name.toLowerCase() === rawCategory) ?? categories[0];
      const priceType = normalizePriceType(cell(row, "price_type") || cell(row, "pricetype") || "freemium") ?? "freemium";
      const slug = uniqueSlug(slugify(cell(row, "slug") || name), [...taken]);
      taken.add(slug);
      names.add(name.toLowerCase());
      const today = new Date().toISOString().slice(0, 10);
      const id = `ai_${slug}`;
      const website = cell(row, "website") || cell(row, "website_url");
      const ai = {
        id,
        name: name.slice(0, 80),
        slug,
        logo: cell(row, "logo").slice(0, 4) || "🤖",
        color: /^#[0-9a-f]{6}$/i.test(cell(row, "color")) ? cell(row, "color") : "#4F46E5",
        website: /^https?:\/\//.test(website) ? website : "",
        category: category.slug,
        priceType,
        description: cell(row, "description").slice(0, 600),
        bestFor: (cell(row, "best_for") || cell(row, "bestfor"))
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6),
        pros: [],
        cons: [],
        freeAlternativeId: null,
        sponsored: false,
        boost: 0,
        planPrice: number(row, "plan_price"),
        planPriceInr: number(row, "plan_price_inr"),
        unitCost: 0,
        visits: 0,
        createdAt: new Date().toISOString(),
        hidden: false,
      };
      db.ai.push(ai);
      db.models.push({
        id: uid("mdl"),
        aiId: id,
        name: `${ai.name} Standard`,
        slug: "standard",
        description: "Main plan imported from the bulk upload.",
        launchDate: today,
        bestFor: `${category.name} tasks`,
        priceType,
      });
      created += 1;
    }
    logAdminAction(
      db,
      admin,
      "bulk uploaded",
      `AI catalogue`,
      `${created} created · ${skipped} skipped (blank or duplicate)`,
    );
  });
  revalidatePath("/");
  revalidatePath("/admin/ai");
  redirect(`/admin/bulk?saved=upload&created=${created}&skipped=${skipped}`);
}

export async function bulkEditAction(formData: FormData) {
  const admin = await assertAdmin("bulk");
  const category = String(formData.get("category") ?? "all");
  const priceTypeRaw = String(formData.get("priceType") ?? "");
  const priceType = priceTypeRaw ? normalizePriceType(priceTypeRaw) : null;
  const planPriceInrRaw = String(formData.get("planPriceInr") ?? "").trim();
  const planPriceRaw = String(formData.get("planPrice") ?? "").trim();
  const boostRaw = String(formData.get("boost") ?? "").trim();
  if (!priceType && !planPriceInrRaw && !planPriceRaw && !boostRaw) redirect("/admin/bulk?error=nothing");

  let changed = 0;
  mutateDb((db) => {
    for (const ai of db.ai) {
      if (category !== "all" && ai.category !== category) continue;
      if (priceType) ai.priceType = priceType;
      if (planPriceInrRaw) ai.planPriceInr = Number(planPriceInrRaw.replace(/[^0-9.]/g, "")) || 0;
      if (planPriceRaw) ai.planPrice = Number(planPriceRaw.replace(/[^0-9.]/g, "")) || 0;
      if (boostRaw) ai.boost = Math.min(1, Math.max(0, Number(boostRaw) || 0));
      changed += 1;
    }
    logAdminAction(
      db,
      admin,
      "bulk edited",
      category === "all" ? "All AI" : `Category: ${category}`,
      `${changed} tools updated`,
    );
  });
  revalidatePath("/");
  redirect(`/admin/bulk?saved=edit&count=${changed}`);
}

export async function bulkDeleteAction(formData: FormData) {
  const admin = await assertAdmin("bulk");
  const category = String(formData.get("category") ?? "all");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "DELETE") redirect("/admin/bulk?error=confirm");

  let removed = 0;
  mutateDb((db) => {
    const targets = db.ai.filter((ai) => category === "all" || ai.category === category);
    const ids = new Set(targets.map((ai) => ai.id));
    const modelIds = new Set(db.models.filter((m) => ids.has(m.aiId)).map((m) => m.id));
    db.ai = db.ai.filter((ai) => !ids.has(ai.id));
    db.models = db.models.filter((m) => !ids.has(m.aiId));
    db.ratings = db.ratings.filter(
      (r) => !ids.has(r.aiId ?? "") && (!r.modelId || !modelIds.has(r.modelId)),
    );
    db.prompts = db.prompts.filter((p) => !ids.has(p.aiId));
    db.bookmarks = db.bookmarks.filter((b) => !ids.has(b.aiId));
    db.follows = db.follows.filter((f) => !ids.has(f.aiId));
    db.priceAlerts = (db.priceAlerts ?? []).filter((row) => !ids.has(row.aiId));
    db.priceHistory = (db.priceHistory ?? []).filter((row) => !ids.has(row.aiId));
    db.claimRequests = (db.claimRequests ?? []).filter((row) => !ids.has(row.aiId));
    db.toolSubmissions = (db.toolSubmissions ?? []).filter((row) => !row.aiId || !ids.has(row.aiId));
    db.reviewReplies = (db.reviewReplies ?? []).filter((row) => !ids.has(row.aiId));
    db.aiVisits = (db.aiVisits ?? []).filter((row) => !ids.has(row.aiId));
    removed = targets.length;
    logAdminAction(
      db,
      admin,
      "bulk deleted",
      category === "all" ? "All AI" : `Category: ${category}`,
      `${removed} tools and their ratings removed`,
    );
  });
  revalidatePath("/");
  redirect(`/admin/bulk?saved=delete&count=${removed}`);
}

/* ======================= 16. gamification ======================= */

export async function saveGamificationAction(formData: FormData) {
  const admin = await assertAdmin("gamification");
  const int = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(formData.get(key) ?? fallback);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
  };
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    db.settings = {
      ...settings,
      gamification: {
        ...settings.gamification,
        enabled: formData.get("enabled") === "on",
        pointsPerRating: int("pointsPerRating", 10, 0, 1000),
        pointsPerReview: int("pointsPerReview", 20, 0, 1000),
        badgeTopReviewer: int("badgeTopReviewer", 100, 0, 100000),
        badgeExpert: int("badgeExpert", 300, 0, 100000),
        newUserDays: int("newUserDays", 7, 0, 365),
        topContributorsEnabled: formData.get("topContributorsEnabled") === "on",
        monthlyReset: formData.get("monthlyReset") === "on",
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(db, admin, "updated", "Gamification", `Rating ${formData.get("pointsPerRating")} pts · review ${formData.get("pointsPerReview")} pts`);
  });
  revalidatePath("/contributors");
  redirect("/admin/gamification?saved=1");
}

export async function resetLeaderboardAction() {
  const admin = await assertAdmin("gamification");
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const at = new Date().toISOString();
    db.settings = { ...settings, gamification: { ...settings.gamification, lastResetAt: at } };
    logAdminAction(db, admin, "reset leaderboard", "Top contributors", `Season restarted ${at.slice(0, 10)}`);
  });
  revalidatePath("/contributors");
  redirect("/admin/gamification?saved=reset");
}

/* ======================= 17. spam & security ======================= */

export async function saveSecurityAction(formData: FormData) {
  const admin = await assertAdmin("security");
  const blocked = normalizeIpList([String(formData.get("blockedIps") ?? "")]);
  const words = normalizeWordList([String(formData.get("badWords") ?? "")]);
  const threshold = Number(formData.get("ipRatingThreshold") ?? 100);
  const badWordAction = formData.get("badWordAction") === "hide" ? "hide" : "pending";
  const googleLogin = formData.get("googleLogin") === "on";
  // Email login can be paused, but the login page warns before anyone locks themselves out.
  const emailLogin = formData.get("emailLogin") === "on";

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    db.settings = {
      ...settings,
      security: {
        ...settings.security,
        ipBlockEnabled: formData.get("ipBlockEnabled") === "on",
        ipRatingThreshold: Number.isFinite(threshold) ? Math.min(10000, Math.max(1, Math.floor(threshold))) : 100,
        blockedIps: blocked,
        badWords: words,
        badWordAction,
        googleLogin,
        emailLogin,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(
      db,
      admin,
      "updated",
      "Spam & security",
      `${blocked.length} blocked IPs · ${words.length} bad words · bad word action ${badWordAction}`,
    );
  });
  redirect("/admin/security?saved=1");
}

export async function unblockIpAction(formData: FormData) {
  const admin = await assertAdmin("security");
  const ip = String(formData.get("ip") ?? "");
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    db.settings = {
      ...settings,
      security: { ...settings.security, blockedIps: settings.security.blockedIps.filter((row) => row !== ip) },
    };
    logAdminAction(db, admin, "unblocked", `IP ${ip}`, "Removed from the block list");
  });
  redirect("/admin/security?saved=1");
}

export async function blockIpAction(formData: FormData) {
  const admin = await assertAdmin("security");
  const [ip] = normalizeIpList([String(formData.get("ip") ?? "")]);
  if (!ip) redirect("/admin/security?error=ip");
  mutateDb((db) => {
    const settings = getSiteSettings(db);
    const blockedIps = [...new Set([...settings.security.blockedIps, ip])].slice(0, 200);
    db.settings = { ...settings, security: { ...settings.security, blockedIps } };
    logAdminAction(db, admin, "blocked", `IP ${ip}`, "Added to the block list");
  });
  redirect("/admin/security?saved=1");
}

export async function setLogoMediaAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const item = db.media?.find((row) => row.id === id);
    if (!item) return;
    const settings = getSiteSettings(db);
    db.settings = {
      ...settings,
      appearance: { ...settings.appearance, logoImage: item.url },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(db, admin, "updated", "Site logo", `Media: ${item.name}`);
  });
  revalidatePath("/");
  redirect("/admin/appearance?saved=logo");
}

/* ================= 19. backup, restore & changelog ================= */

export async function restoreBackupAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  if (String(formData.get("confirm") ?? "").trim() !== "RESTORE") redirect("/admin/export?error=confirm");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/export?error=file");
  if (file.size > 8_000_000) redirect("/admin/export?error=large");

  let parsed: Partial<DB>;
  try {
    parsed = JSON.parse(await file.text()) as Partial<DB>;
  } catch {
    redirect("/admin/export?error=parse");
  }
  if (!Array.isArray(parsed.ai) || !Array.isArray(parsed.ratings) || !Array.isArray(parsed.users)) {
    redirect("/admin/export?error=shape");
  }

  let counts = { ai: 0, ratings: 0, users: 0 };
  mutateDb((db) => {
    const currentAdmin = db.users.find((user) => user.id === admin.id) ?? admin;
    const backupAdmin = parsed.users!.find(
      (user) => user.id === currentAdmin.id || user.email.toLowerCase() === currentAdmin.email.toLowerCase(),
    );
    const users: import("@/lib/types").User[] = parsed.users!.map((user) => {
      const existing = db.users.find(
        (row) => row.id === user.id || row.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (backupAdmin && user.id === backupAdmin.id) {
        return { ...user, role: "admin" as const, banned: false, passwordHash: currentAdmin.passwordHash };
      }
      // Backups never contain password hashes, so keep the live hash for known accounts.
      return { ...user, passwordHash: user.passwordHash ?? existing?.passwordHash };
    });
    if (!users.some((user) => user.id === currentAdmin.id)) users.push(currentAdmin);

    db.version = parsed.version ?? 1;
    db.ai = parsed.ai!;
    db.models = parsed.models ?? [];
    db.ratings = parsed.ratings!;
    db.posts = parsed.posts ?? [];
    db.prompts = parsed.prompts ?? [];
    db.bookmarks = parsed.bookmarks ?? [];
    db.follows = parsed.follows ?? [];
    db.users = users;
    db.rateEvents = parsed.rateEvents ?? [];
    db.authEvents = parsed.authEvents ?? [];
    db.settings = getSiteSettings(parsed as DB);
    db.categories = parsed.categories;
    db.searchLogs = parsed.searchLogs ?? [];
    db.notifications = parsed.notifications ?? [];
    db.emailOutbox = parsed.emailOutbox ?? [];
    db.searchCache = parsed.searchCache ?? [];
    db.searchAiReports = parsed.searchAiReports ?? [];
    db.searchRequests = parsed.searchRequests ?? [];
    db.media = parsed.media ?? [];
    db.pages = parsed.pages ?? [];
    db.traffic = parsed.traffic ?? [];
    db.feedback = parsed.feedback ?? [];
    db.pointEvents = parsed.pointEvents ?? [];
    db.changelog = parsed.changelog ?? [];
    db.adminLog = parsed.adminLog ?? [];
    db.appPricing = parsed.appPricing ?? {};
    db.priceHistory = parsed.priceHistory ?? [];
    db.priceAlerts = parsed.priceAlerts ?? [];
    db.subscribers = parsed.subscribers ?? [];
    db.claimRequests = parsed.claimRequests ?? [];
    db.reviewReplies = parsed.reviewReplies ?? [];
    db.aiVisits = parsed.aiVisits ?? [];
    db.toolSubmissions = parsed.toolSubmissions ?? [];
    db.pricingReports = parsed.pricingReports ?? [];
    counts = { ai: db.ai.length, ratings: db.ratings.length, users: db.users.length };
    logAdminAction(
      db,
      currentAdmin,
      "restored",
      "Database backup",
      `${counts.ai} AI · ${counts.ratings} ratings · ${counts.users} users restored`,
    );
  });
  await flushPendingWrites();
  revalidatePath("/");
  redirect(`/admin/export?restored=${counts.ai}`);
}

export async function saveChangelogAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const id = String(formData.get("id") ?? "");
  const version = String(formData.get("version") ?? "").trim().slice(0, 24);
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 3000);
  if (!title) redirect("/admin/export?error=changelog");
  mutateDb((db) => {
    if (!Array.isArray(db.changelog)) db.changelog = [];
    const payload = {
      version: version || "update",
      title,
      body,
      published: formData.get("published") === "on",
    };
    const index = id ? db.changelog.findIndex((row) => row.id === id) : -1;
    if (index >= 0) db.changelog[index] = { ...db.changelog[index], ...payload };
    else db.changelog.unshift({ id: uid("cl"), at: new Date().toISOString(), ...payload });
    db.changelog = db.changelog.slice(0, 60);
    logAdminAction(db, admin, "updated", `Changelog: ${title}`, payload.version);
  });
  revalidatePath("/changelog");
  redirect("/admin/export?saved=changelog");
}

export async function deleteChangelogAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const row = db.changelog?.find((entry) => entry.id === id);
    db.changelog = (db.changelog ?? []).filter((entry) => entry.id !== id);
    if (row) logAdminAction(db, admin, "deleted", `Changelog: ${row.title}`, row.version);
  });
  revalidatePath("/changelog");
  redirect("/admin/export?saved=changelog");
}

/* ========================= 20. appearance ========================= */

export async function saveAppearanceAction(formData: FormData) {
  const admin = await assertAdmin("settings");
  const currency = String(formData.get("currency") ?? "INR") === "USD" ? "USD" : "INR";
  const theme = String(formData.get("theme") ?? "light") === "dark" ? "dark" : "light";
  const accentRaw = String(formData.get("accent") ?? "indigo");
  const accent = (["indigo", "cyan", "emerald", "rose", "amber"] as const).includes(
    accentRaw as "indigo" | "cyan" | "emerald" | "rose" | "amber",
  )
    ? (accentRaw as "indigo" | "cyan" | "emerald" | "rose" | "amber")
    : "indigo";
  const usdRate = Number(formData.get("usdRate") ?? 88);
  const logoImage = String(formData.get("logoImage") ?? "").trim();
  const festiveLogo = String(formData.get("festiveLogo") ?? "").trim();
  const validUrl = (value: string) =>
    !value || value.startsWith("/") || value.startsWith("data:image/") || /^https:\/\//.test(value);
  if (!validUrl(logoImage) || !validUrl(festiveLogo)) redirect("/admin/appearance?error=logo");

  mutateDb((db) => {
    const settings = getSiteSettings(db);
    db.settings = {
      ...settings,
      appearance: {
        ...settings.appearance,
        currency,
        theme,
        accent,
        usdRate: Number.isFinite(usdRate) ? Math.min(500, Math.max(1, usdRate)) : 88,
        logoImage: logoImage.slice(0, 900000),
        festiveLogo: festiveLogo.slice(0, 900000),
        festiveLogoUntil: String(formData.get("festiveLogoUntil") ?? "").trim() || null,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name,
    };
    logAdminAction(db, admin, "updated", "Appearance", `${currency} · ${theme} theme · ${accent} accent${logoImage ? " · custom logo" : ""}`);
  });
  revalidatePath("/");
  redirect("/admin/appearance?saved=1");
}

/* ========================== 21. feedback ========================== */

export async function submitFeedbackAction(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "contact");
  const kind: FeedbackKind = kindRaw === "feature" || kindRaw === "bug" ? kindRaw : "contact";
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 140);
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const page = String(formData.get("page") ?? "").trim().slice(0, 200);
  const screenshot = String(formData.get("screenshot") ?? "").trim().slice(0, 500);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5) {
    redirect(`/contact?error=fields&type=${kind}`);
  }
  if (screenshot && !/^https?:\/\//.test(screenshot) && !screenshot.startsWith("/")) {
    redirect(`/contact?error=screenshot&type=${kind}`);
  }

  const user = await getCurrentUser();
  mutateDb((db) => {
    if (!Array.isArray(db.feedback)) db.feedback = [];
    db.feedback.unshift({
      id: uid("fb"),
      kind,
      name,
      email,
      message,
      page: page.startsWith("/") ? page : "",
      screenshot: screenshot || undefined,
      userId: user?.id ?? null,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    db.feedback = db.feedback.slice(0, 300);
  });
  redirect(`/contact?sent=${kind}`);
}

export async function setFeedbackStatusAction(formData: FormData) {
  const admin = await assertAdmin("feedback");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  if (!["new", "approved", "rejected", "done"].includes(status)) redirect("/admin/feedback");
  mutateDb((db) => {
    const row = db.feedback?.find((item) => item.id === id);
    if (!row) return;
    row.status = status as "new" | "approved" | "rejected" | "done";
    logAdminAction(db, admin, `feedback ${status}`, `${row.kind}: ${row.name}`, row.message.slice(0, 80));
  });
  redirect("/admin/feedback?saved=1");
}

export async function deleteFeedbackAction(formData: FormData) {
  const admin = await assertAdmin("feedback");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const row = db.feedback?.find((item) => item.id === id);
    db.feedback = (db.feedback ?? []).filter((item) => item.id !== id);
    if (row) logAdminAction(db, admin, "deleted", `Feedback: ${row.name}`, row.kind);
  });
  redirect("/admin/feedback?saved=1");
}

/* ======================= pricing reports ======================= */

/** Public: report a wrong subscription plan or API/model price. */
export async function submitPricingReportAction(formData: FormData) {
  const typeRaw = String(formData.get("targetType") ?? "");
  const targetType = typeRaw === "model" || typeRaw === "app" ? typeRaw : "ai";
  const targetId = String(formData.get("targetId") ?? "").slice(0, 120);
  const targetName = String(formData.get("targetName") ?? "").slice(0, 120);
  const backRaw = String(formData.get("back") ?? "/");
  const back =
    backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw.split(/[?#]/)[0] || "/" : "/";
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);

  if (!targetId || message.length < 5) redirect(`${back}?pricingReport=short#pricing`);

  const user = await getCurrentUser();
  const ip = await requestIp();
  mutateDb((db) => {
    if (!Array.isArray(db.pricingReports)) db.pricingReports = [];
    const duplicate = db.pricingReports.some(
      (row) =>
        row.ip === ip &&
        row.targetType === targetType &&
        row.targetId === targetId &&
        row.message === message &&
        Date.now() - +new Date(row.createdAt) < 10 * 60 * 1000,
    );
    if (!duplicate) {
      db.pricingReports.unshift({
        id: uid("prc"),
        targetType,
        targetId,
        targetName: targetName || targetId,
        message,
        userId: user?.id ?? null,
        userName: user?.name ?? "Guest visitor",
        email: user?.email ?? "",
        ip,
        status: "open",
        createdAt: new Date().toISOString(),
      });
      db.pricingReports = db.pricingReports.slice(0, 400);
    }
  });
  revalidatePath("/admin/pricing");
  redirect(`${back}?pricingReport=sent#pricing`);
}

export async function setPricingReportStatusAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "open");
  if (!["open", "fixed", "dismissed"].includes(status)) redirect("/admin/pricing");
  mutateDb((db) => {
    const row = db.pricingReports?.find((item) => item.id === id);
    if (!row) return;
    row.status = status as "open" | "fixed" | "dismissed";
    row.resolvedAt = status === "open" ? null : new Date().toISOString();
    logAdminAction(db, admin, `pricing report ${status}`, row.targetName, row.message.slice(0, 80));
  });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=1");
}

export async function deletePricingReportAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const row = db.pricingReports?.find((item) => item.id === id);
    db.pricingReports = (db.pricingReports ?? []).filter((item) => item.id !== id);
    if (row) logAdminAction(db, admin, "pricing report deleted", row.targetName, row.message.slice(0, 60));
  });
  redirect("/admin/pricing?saved=1");
}

/* ===================== public notification inbox ===================== */

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  mutateDb((db) => {
    for (const notification of db.notifications ?? []) {
      if (notification.audience === "staff" && user.role === "user") continue;
      const readBy = notification.readBy ?? [];
      if (!readBy.includes(user.id)) {
        notification.readBy = [...readBy, user.id].slice(-500);
      }
    }
  });
  revalidatePath("/notifications");
  redirect("/notifications");
}

/* ==================== community: tool submissions ==================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string) {
  return EMAIL_RE.test(value.trim()) && value.trim().length <= 160;
}

/** Accepts "example.com" or a full URL and returns a canonical https URL. */
function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!url.hostname.includes(".")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

/** Emails everyone watching this tool when an admin changes its price. */
function notifyPriceWatchers(db: DB, ai: { id: string; name: string; slug: string; planPrice: number }, previousPrice: number) {
  const watchers = (db.priceAlerts ?? []).filter((alert) => alert.aiId === ai.id);
  if (watchers.length === 0) return;
  const users = new Map(db.users.map((user) => [user.id, user]));
  const settings = getSiteSettings(db);
  const direction = ai.planPrice < previousPrice ? "dropped" : "changed";
  pushNotification(db, {
    title: `Price ${direction}: ${ai.name}`,
    body: `The starting plan went from $${previousPrice} to $${ai.planPrice} per month.`,
    href: `/ai/${ai.slug}#pricing`,
    kind: "ai",
  });
  const stamp = new Date().toISOString();
  for (const alert of watchers) alert.lastNotifiedAt = stamp;
  if (!settings.email.enabled) return;
  for (const alert of watchers) {
    const user = users.get(alert.userId);
    if (!user) continue;
    queueEmail(db, settings.email, {
      to: user.email,
      kind: "newsletter",
      subject: `Price ${direction} on {{site}}: ${ai.name}`,
      body: `Hi ${user.name},\n\nThe starting plan for ${ai.name} went from $${previousPrice} to $${ai.planPrice} per month.\n\nSee the full pricing history: https://giglenode.com/ai/${ai.slug}#pricing\n\n— The ${settings.siteName} team`,
          });
  }
}

export async function submitToolAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const website = normalizeUrl(String(formData.get("website") ?? ""));
  const category = String(formData.get("category") ?? "").trim();
  const priceTypeRaw = String(formData.get("priceType") ?? "freemium");
  const priceType: PriceType = priceTypeRaw === "free" || priceTypeRaw === "paid" ? priceTypeRaw : "freemium";
  const planPrice = Math.min(10000, Math.max(0, Number(formData.get("planPrice") ?? 0) || 0));
  const description = String(formData.get("description") ?? "").trim().slice(0, 900);
  const submitterName = String(formData.get("submitterName") ?? "").trim().slice(0, 80);
  const submitterEmail = String(formData.get("submitterEmail") ?? "").trim().slice(0, 160);

  if (name.length < 2) return { ok: false, error: "Please enter the tool name." };
  if (!website) return { ok: false, error: "Please enter a valid website, for example example.com." };
  if (description.length < 20) return { ok: false, error: "Please describe the tool in at least 20 characters." };
  if (!isEmail(submitterEmail)) return { ok: false, error: "Please enter a valid email address." };

  const db = readDb();
  const categories = getCategories(db);
  if (!categories.some((row) => row.slug === category)) return { ok: false, error: "Please choose a category." };
  const duplicate = (db.toolSubmissions ?? []).find(
    (row) => row.status === "pending" && row.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) return { ok: true, message: "This tool is already in the review queue. Thanks for the nudge!" };

  const user = await getCurrentUser();
  mutateDb((draft) => {
    if (!Array.isArray(draft.toolSubmissions)) draft.toolSubmissions = [];
    draft.toolSubmissions.unshift({
      id: uid("sub"),
      name,
      website,
      category,
      priceType,
      planPrice,
      description,
      submitterName: submitterName || user?.name || "Anonymous",
      submitterEmail,
      userId: user?.id ?? null,
      status: "pending",
      note: "",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    });
    pushNotification(draft, {
      title: `New tool submitted: ${name}`,
      body: `${submitterName || user?.name || "A visitor"} suggested ${name}. Review it in Submissions.`,
      href: "/admin/submissions",
      kind: "system",
      audience: "staff",
    });
  });
  revalidatePath("/admin/submissions");
  return { ok: true, message: "Thanks! Your suggestion is in the review queue — we publish verified tools within a few days." };
}

export async function reviewToolSubmissionAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "reject");
  let slugOut = "";

  mutateDb((db) => {
    const row = (db.toolSubmissions ?? []).find((item) => item.id === id);
    if (!row || row.status !== "pending") return;
    row.reviewedAt = new Date().toISOString();
    row.reviewedBy = admin.name;
    if (decision !== "approve") {
      row.status = "rejected";
      logAdminAction(db, admin, "rejected submission", row.name, row.submitterEmail);
      return;
    }

    const settings = getSiteSettings(db);
    const slug = uniqueSlug(slugify(row.name), db.ai.map((a) => a.slug));
    const aiId = `ai_${slug}`;
    const category = getCategories(db).find((c) => c.slug === row.category);
    const created: DB["ai"][number] = {
      id: aiId,
      name: row.name,
      slug,
      logo: "✦",
      color: "#4F46E5",
      website: row.website,
      category: row.category,
      priceType: row.priceType,
      description: row.description,
      bestFor: [category?.name ?? "General tasks"],
      pros: ["Suggested by the community and checked by the editors", "Clear pricing published on the official site"],
      cons: ["New listing — only a few user ratings so far", "Confirm current limits on the official site"],
      freeAlternativeId: null,
      sponsored: false,
      boost: 0,
      planPrice: row.planPrice,
      planPriceInr: Math.round(row.planPrice * (settings.appearance.usdRate || 88)),
      unitCost: 0,
      visits: 0,
      createdAt: new Date().toISOString(),
      plans: [],
      platforms: ["web"],
    };
    db.ai.push(created);
    db.models.push({
      id: `md_${slug}_core`,
      aiId,
      name: `${row.name} Core`,
      slug: "core",
      description: row.description.slice(0, 320),
      launchDate: new Date().toISOString().slice(0, 10),
      bestFor: category?.name ?? "General tasks",
      priceType: row.priceType,
    });
    row.status = "approved";
    row.aiId = aiId;
    slugOut = slug;
    recordPriceSnapshot(db, created);
    if (settings.notificationsAuto) {
      pushNotification(db, {
        title: `New AI added: ${row.name}`,
        body: `${row.name} is now listed under ${category?.name ?? row.category}. Rate it and help the ranking.`,
        href: `/ai/${slug}`,
        kind: "ai",
        auto: true,
      });
    }
    logAdminAction(db, admin, "approved submission", `AI: ${row.name}`, `Suggested by ${row.submitterEmail}`);
  });

  await flushPendingWrites();
  revalidatePath("/");
  revalidatePath("/admin/submissions");
  if (slugOut) revalidatePath(`/ai/${slugOut}`);
  redirect(`/admin/submissions?saved=${decision === "approve" ? "approved" : "rejected"}`);
}

/* ==================== community: vendor claims ==================== */

export async function claimListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const aiId = String(formData.get("aiId") ?? "");
  const vendorName = String(formData.get("vendorName") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);

  if (vendorName.length < 2) return { ok: false, error: "Please enter your name or company." };
  if (!isEmail(email)) return { ok: false, error: "Please enter a valid work email." };

  const db = readDb();
  const ai = db.ai.find((row) => row.id === aiId);
  if (!ai) return { ok: false, error: "This listing no longer exists." };
  if (ai.claim) return { ok: false, error: "This listing is already claimed. Contact us if the claim is wrong." };
  const pending = (db.claimRequests ?? []).find(
    (row) => row.aiId === aiId && row.status === "pending" && row.email.toLowerCase() === email.toLowerCase(),
  );
  if (pending) return { ok: true, message: "Your claim is already in review. We will email you once it is approved." };

  mutateDb((draft) => {
    if (!Array.isArray(draft.claimRequests)) draft.claimRequests = [];
    draft.claimRequests.unshift({
      id: uid("clm"),
      aiId,
      aiName: ai.name,
      vendorName,
      email,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    });
    pushNotification(draft, {
      title: `Listing claim: ${ai.name}`,
      body: `${vendorName} (${email}) wants to claim this listing.`,
      href: "/admin/submissions",
      kind: "system",
      audience: "staff",
    });
  });
  revalidatePath("/admin/submissions");
  return { ok: true, message: "Claim submitted. Once approved you can reply to reviews from this page." };
}

export async function reviewClaimAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "reject");

  mutateDb((db) => {
    const row = (db.claimRequests ?? []).find((item) => item.id === id);
    if (!row || row.status !== "pending") return;
    row.reviewedAt = new Date().toISOString();
    row.reviewedBy = admin.name;
    const ai = db.ai.find((item) => item.id === row.aiId);
    if (decision !== "approve" || !ai || ai.claim) {
      row.status = "rejected";
      logAdminAction(db, admin, "rejected claim", row.aiName, row.email);
      return;
    }
    row.status = "approved";
    ai.claim = { vendorName: row.vendorName, email: row.email, at: new Date().toISOString() };
    for (const other of db.claimRequests ?? []) {
      if (other.aiId === row.aiId && other.id !== row.id && other.status === "pending") other.status = "rejected";
    }
    logAdminAction(db, admin, "approved claim", `AI: ${row.aiName}`, row.vendorName);
  });
  await flushPendingWrites();
  revalidatePath("/admin/submissions");
  redirect(`/admin/submissions?saved=${decision === "approve" ? "claimed" : "claim-rejected"}`);
}

export async function replyToReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to reply." };
  const ratingId = String(formData.get("ratingId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 600);
  if (body.length < 10) return { ok: false, error: "Please write at least 10 characters." };

  const db = readDb();
  const rating = db.ratings.find((row) => row.id === ratingId);
  if (!rating) return { ok: false, error: "That review no longer exists." };
  const model = db.models.find((row) => row.id === rating.modelId);
  const ai = model ? db.ai.find((row) => row.id === model.aiId) : null;
  if (!ai) return { ok: false, error: "That review no longer exists." };

  const isVendor = Boolean(ai.claim && ai.claim.email.toLowerCase() === user.email.toLowerCase());
  const isModerator = canAccess(user.role, "ratings", resolveRoles(db.roles));
  if (!isVendor && !isModerator) {
    return { ok: false, error: "Only the verified vendor or a GigleNode moderator can reply here." };
  }

  mutateDb((draft) => {
    if (!Array.isArray(draft.reviewReplies)) draft.reviewReplies = [];
    draft.reviewReplies.push({
      id: uid("rep"),
      ratingId,
      aiId: ai.id,
      vendorName: isVendor ? ai.claim!.vendorName : `${user.name} · GigleNode`,
      email: user.email,
      body,
      createdAt: new Date().toISOString(),
    });
  });
  await flushPendingWrites();
  revalidatePath(`/ai/${ai.slug}`);
  return { ok: true, message: isVendor ? "Your reply is published under the review." : "Moderator reply published." };
}

/* ==================== price alerts & newsletter ==================== */

export async function togglePriceAlertAction(formData: FormData) {
  const user = await getCurrentUser();
  const aiId = String(formData.get("aiId") ?? "");
  const back = String(formData.get("back") ?? "/");
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  mutateDb((db) => {
    if (!Array.isArray(db.priceAlerts)) db.priceAlerts = [];
    const index = db.priceAlerts.findIndex((row) => row.userId === user.id && row.aiId === aiId);
    if (index >= 0) db.priceAlerts.splice(index, 1);
    else db.priceAlerts.push({ id: uid("pal"), userId: user.id, aiId, createdAt: new Date().toISOString(), lastNotifiedAt: null });
  });
  await flushPendingWrites();
  revalidatePath(back);
  redirect(back);
}

export type NewsletterState = ActionState & { confirmUrl?: string };

export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);
  const source = String(formData.get("source") ?? "footer").slice(0, 40);
  if (!isEmail(email)) return { ok: false, error: "Please enter a valid email address." };

  const db = readDb();
  const existing = (db.subscribers ?? []).find((row) => row.email.toLowerCase() === email.toLowerCase());
  if (existing?.confirmed && !existing.unsubscribedAt) {
    return { ok: true, message: "You are already subscribed to the weekly Top 5." };
  }

  const token = existing?.token ?? crypto.randomUUID().replaceAll("-", "");
  const user = await getCurrentUser();
  mutateDb((draft) => {
    if (!Array.isArray(draft.subscribers)) draft.subscribers = [];
    const row = draft.subscribers.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (row) {
      row.token = token;
      row.unsubscribedAt = null;
      row.confirmed = false;
    } else {
      draft.subscribers.unshift({
        id: uid("sub"),
        email,
        name: user?.name ?? "",
        token,
        confirmed: false,
        createdAt: new Date().toISOString(),
        confirmedAt: null,
        source,
        unsubscribedAt: null,
      });
    }
    const settings = getSiteSettings(draft);
    if (settings.email.enabled) {
      queueEmail(draft, settings.email, {
        to: email,
        kind: "newsletter",
        subject: `Confirm your {{site}} newsletter`,
        body: `Hi there,\n\nConfirm your subscription to the {{site}} weekly Top 5 AI email:\n{{site}}/newsletter/confirm?token=${token}\n\nIf you did not ask for this, ignore this email.\n\n— The {{site}} team`,
      });
    }
  });

  await flushPendingWrites();
  revalidatePath("/admin/submissions");
  return {
    ok: true,
    message: "Almost done — confirm your email to start receiving the weekly Top 5.",
    confirmUrl: `/newsletter/confirm?token=${token}`,
  };
}

export async function confirmNewsletterAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const db = readDb();
  const row = (db.subscribers ?? []).find((item) => item.token === token);
  if (!row) redirect("/newsletter/confirm?error=missing");
  mutateDb((draft) => {
    const target = (draft.subscribers ?? []).find((item) => item.token === token);
    if (!target) return;
    target.confirmed = true;
    target.confirmedAt = new Date().toISOString();
    target.unsubscribedAt = null;
  });
  // The redirect may be served by another isolate, so make sure the write landed first.
  await flushPendingWrites();
  revalidatePath("/admin/submissions");
  redirect(`/newsletter/confirm?token=${encodeURIComponent(token)}&done=1`);
}

export async function unsubscribeNewsletterAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const db = readDb();
  const row = (db.subscribers ?? []).find((item) => item.token === token);
  if (!row) redirect("/newsletter/unsubscribe?error=missing");
  mutateDb((draft) => {
    const target = (draft.subscribers ?? []).find((item) => item.token === token);
    if (!target) return;
    target.unsubscribedAt = new Date().toISOString();
  });
  await flushPendingWrites();
  revalidatePath("/admin/submissions");
  redirect(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}

export async function deleteSubscriberAction(formData: FormData) {
  const admin = await assertAdmin("catalogue");
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const row = (db.subscribers ?? []).find((item) => item.id === id);
    db.subscribers = (db.subscribers ?? []).filter((item) => item.id !== id);
    if (row) logAdminAction(db, admin, "removed subscriber", row.email, "Newsletter list");
  });
  revalidatePath("/admin/submissions");
  redirect("/admin/submissions?saved=subscriber-removed");
}
