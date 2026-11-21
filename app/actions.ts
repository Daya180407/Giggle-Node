"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAction } from "@/lib/admin-log";
import { APP_ENTRIES } from "@/lib/software";
import { getCurrentUser, requestIp } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { mutateDb, readDb, uid } from "@/lib/store";
import type { CategorySlug, PostStatus, PostType, PriceType } from "@/lib/types";

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

/* ------------------------------ ratings ------------------------------ */

export async function rateModelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to submit a rating." };

  const modelId = String(formData.get("modelId") ?? "");
  const stars = Number(formData.get("stars"));
  const review = String(formData.get("review") ?? "").trim().slice(0, 600);

  if (!modelId) return { ok: false, error: "Model not found." };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { ok: false, error: "Please choose a rating between 1 and 5 stars." };
  }

  const db = readDb();
  if (!getSiteSettings(db).allowRatings) {
    return { ok: false, error: "Ratings are temporarily paused by the administrator." };
  }

  const ip = await requestIp();
  const dayAgo = Date.now() - 86400000;
  const ipCount = db.rateEvents.filter((e) => e.ip === ip && +new Date(e.at) > dayAgo).length;
  if (ipCount >= MAX_RATINGS_PER_DAY) {
    return { ok: false, error: `This network has reached the limit of ${MAX_RATINGS_PER_DAY} ratings per 24 hours.` };
  }

  const existing = db.ratings.find((r) => r.userId === user.id && r.modelId === modelId);
  const model = db.models.find((m) => m.id === modelId);
  if (!model) return { ok: false, error: "Model not found." };
  const parent = db.ai.find((a) => a.id === model.aiId);
  const modelPath = parent ? `/ai/${parent.slug}/${model.slug}` : "/";
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
      row.updatedAt = new Date().toISOString();
      row.lastEditedAt = new Date().toISOString();
      d.rateEvents.push({ ip, at: new Date().toISOString() });
    });
    revalidatePath(modelPath);
    revalidatePath("/");
    return { ok: true, message: "Your rating has been updated." };
  }

  mutateDb((d) => {
    d.ratings.push({
      id: uid("rt"),
      userId: user.id,
      modelId,
      stars,
      review: review || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedAt: null,
    });
    d.rateEvents.push({ ip, at: new Date().toISOString() });
  });
  revalidatePath(modelPath);
  revalidatePath("/");
  return { ok: true, message: "Rating saved. Thank you!" };
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

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login?next=/admin");
  return user;
}

export async function saveAiAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  if (!name) redirect("/admin/ai?error=name");

  mutateDb((db) => {
    const taken = db.ai.filter((a) => a.id !== id).map((a) => a.slug);
    const slug = uniqueSlug(slugify(rawSlug || name), taken);
    const bestFor = String(formData.get("bestFor") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name,
      slug,
      category: String(formData.get("category") ?? "writing") as CategorySlug,
      priceType: String(formData.get("priceType") ?? "freemium") as PriceType,
      website: String(formData.get("website") ?? "").trim(),
      logo: String(formData.get("logo") ?? "🤖").slice(0, 4) || "🤖",
      color: String(formData.get("color") ?? "#4F46E5"),
      description: String(formData.get("description") ?? "").trim(),
      bestFor,
      pros: [
        bestFor[0] ? `Strong output for ${bestFor[0]}` : "Usable output for everyday tasks",
        "You can start on a free or low-cost plan",
        "Simple interface with a short learning curve",
      ],
      cons: [
        "Not 100% accurate on every task",
        "Advanced features sit behind a paid plan",
        "Output still needs a human review",
      ],
      planPrice: Number(formData.get("planPrice") ?? 0) || 0,
      unitCost: Number(formData.get("unitCost") ?? 0) || 0,
      freeAlternativeId: String(formData.get("freeAlternativeId") ?? "") || null,
      sponsored: formData.get("sponsored") === "on",
      boost: Number(formData.get("boost") ?? 0) || 0,
    };
    if (id) {
      const ai = db.ai.find((a) => a.id === id);
      if (ai) {
        Object.assign(ai, payload);
        logAdminAction(db, admin, "updated", `AI: ${name}`, `Category: ${payload.category}`);
      }
    } else {
      db.ai.push({
        id: `ai_${slug}`,
        ...payload,
        visits: 0,
        createdAt: new Date().toISOString(),
      });
      logAdminAction(db, admin, "created", `AI: ${name}`, `Category: ${payload.category}`);
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/ai");
  redirect("/admin/ai");
}

export async function deleteAiAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const deletedName = db.ai.find((a) => a.id === id)?.name ?? id;
    const modelIds = new Set(db.models.filter((m) => m.aiId === id).map((m) => m.id));
    db.ai = db.ai.filter((a) => a.id !== id);
    db.models = db.models.filter((m) => m.aiId !== id);
    db.ratings = db.ratings.filter((r) => !modelIds.has(r.modelId));
    db.prompts = db.prompts.filter((p) => p.aiId !== id);
    db.bookmarks = db.bookmarks.filter((b) => b.aiId !== id);
    db.follows = db.follows.filter((f) => f.aiId !== id);
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
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const aiId = String(formData.get("aiId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!aiId || !name) redirect(`/admin/ai/${aiId.replace("ai_", "")}?error=fields`);

  mutateDb((db) => {
    const taken = db.models.filter((m) => m.aiId === aiId && m.id !== id).map((m) => m.slug);
    const payload = {
      aiId,
      name,
      slug: uniqueSlug(slugify(String(formData.get("slug") ?? "") || name), taken),
      description: String(formData.get("description") ?? "").trim(),
      launchDate: String(formData.get("launchDate") ?? "") || new Date().toISOString().slice(0, 10),
      bestFor: String(formData.get("bestFor") ?? "").trim(),
      priceType: String(formData.get("priceType") ?? "freemium") as PriceType,
    };
    const aiName = db.ai.find((a) => a.id === aiId)?.name ?? aiId;
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
  redirect(`/admin/ai/${aiId.replace("ai_", "")}`);
}

export async function deleteModelAction(formData: FormData) {
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
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
      db.prompts.push({ id: uid("pr"), aiId, title, promptText });
      logAdminAction(db, admin, "created", `Prompt: ${title}`, `AI id ${aiId}`);
    }
  });
  redirect(`/admin/ai/${aiSlug}`);
}

export async function deletePromptAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    const promptTitle = db.prompts.find((p) => p.id === id)?.title ?? id;
    db.prompts = db.prompts.filter((p) => p.id !== id);
    logAdminAction(db, admin, "deleted", `Prompt: ${promptTitle}`, "Prompt removed");
  });
  redirect(`/admin/ai/${aiSlug}`);
}

export async function savePostAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/posts?error=title");

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
      status: String(formData.get("status") ?? "draft") as PostStatus,
      relatedAiIds: related,
      sponsored: formData.get("sponsored") === "on",
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
    }
  });
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData) {
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const backRaw = String(formData.get("back") ?? "/admin/ratings");
  const back = backRaw.startsWith("/admin/") ? backRaw : "/admin/ratings";
  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    const modelName = rating ? db.models.find((m) => m.id === rating.modelId)?.name : undefined;
    db.ratings = db.ratings.filter((r) => r.id !== id);
    logAdminAction(db, admin, "deleted", `Rating: ${modelName ?? id}`, `${rating?.stars ?? "?"}★ removed`);
  });
  revalidatePath(back);
  redirect(back);
}

export async function toggleRoleAction(formData: FormData) {
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
  const supportEmail = String(formData.get("supportEmail") ?? "").trim().slice(0, 120);
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    redirect("/admin/settings?error=email");
  }

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
    adsEnabled,
    adsClientId,
    adsTopSlot,
    adsSidebarSlot,
    adsArticleSlot,
    supportEmail,
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
      `Announcement ${next.announcementEnabled ? "on" : "off"}, signups ${next.allowSignups ? "on" : "off"}, ratings ${next.allowRatings ? "on" : "off"}, promo ${next.showPromotions ? "on" : "off"}, ads ${adsEnabled ? "on" : "off"}`,
    );
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

/* ------------------------------- users ------------------------------- */

export async function toggleBanAction(formData: FormData) {
  const admin = await assertAdmin();
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
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || user.id === admin.id) return;
    db.users = db.users.filter((u) => u.id !== id);
    db.ratings = db.ratings.filter((r) => r.userId !== id);
    db.bookmarks = db.bookmarks.filter((b) => b.userId !== id);
    db.follows = db.follows.filter((f) => f.userId !== id);
    logAdminAction(db, admin, "deleted", `User: ${user.email}`, `${user.name} and their activity removed`);
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/* ------------------------------ ratings ------------------------------ */

export async function updateRatingAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const stars = Number(formData.get("stars"));
  const review = String(formData.get("review") ?? "").trim().slice(0, 600);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) redirect("/admin/ratings?error=stars");

  mutateDb((db) => {
    const rating = db.ratings.find((r) => r.id === id);
    if (!rating) return;
    const modelName = db.models.find((m) => m.id === rating.modelId)?.name ?? rating.modelId;
    rating.stars = stars;
    rating.review = review || null;
    rating.updatedAt = new Date().toISOString();
    logAdminAction(db, admin, "edited rating", `Rating: ${modelName}`, `${stars}★${review ? " with review" : ""}`);
  });
  revalidatePath("/admin/ratings");
  revalidatePath("/");
  redirect("/admin/ratings");
}

/* ------------------------------- posts ------------------------------- */

export async function setPostStatusAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "draft") as PostStatus;
  mutateDb((db) => {
    const post = db.posts.find((p) => p.id === id);
    if (!post) return;
    post.status = status === "published" ? "published" : "draft";
    post.updatedAt = new Date().toISOString();
    logAdminAction(db, admin, post.status === "published" ? "published" : "unpublished", `Post: ${post.title}`, post.slug);
  });
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function toggleAppVisibilityAction(formData: FormData) {
  const admin = await assertAdmin();
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

export async function duplicatePostAction(formData: FormData) {
  const admin = await assertAdmin();
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
