"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requestIp } from "@/lib/auth";
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
  await assertAdmin();
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
      if (ai) Object.assign(ai, payload);
    } else {
      db.ai.push({
        id: `ai_${slug}`,
        ...payload,
        visits: 0,
        createdAt: new Date().toISOString(),
      });
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/ai");
  redirect("/admin/ai");
}

export async function deleteAiAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
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
  });
  revalidatePath("/");
  redirect("/admin/ai");
}

export async function saveModelAction(formData: FormData) {
  await assertAdmin();
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
    if (id) {
      const model = db.models.find((m) => m.id === id);
      if (model) Object.assign(model, payload);
    } else {
      db.models.push({ id: `mdl_${payload.slug}_${Date.now().toString(36)}`, ...payload });
    }
  });
  revalidatePath("/");
  redirect(`/admin/ai/${aiId.replace("ai_", "")}`);
}

export async function deleteModelAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    db.models = db.models.filter((m) => m.id !== id);
    db.ratings = db.ratings.filter((r) => r.modelId !== id);
  });
  revalidatePath("/");
  redirect(`/admin/ai/${aiSlug}`);
}

export async function savePromptAction(formData: FormData) {
  await assertAdmin();
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
      }
    } else if (title && promptText) {
      db.prompts.push({ id: uid("pr"), aiId, title, promptText });
    }
  });
  redirect(`/admin/ai/${aiSlug}`);
}

export async function deletePromptAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const aiSlug = String(formData.get("aiSlug") ?? "");
  mutateDb((db) => {
    db.prompts = db.prompts.filter((p) => p.id !== id);
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
      if (post) Object.assign(post, payload);
    } else {
      db.posts.push({
        id: uid("post"),
        ...payload,
        createdAt: new Date().toISOString(),
      });
    }
  });
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    db.posts = db.posts.filter((p) => p.id !== id);
  });
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function deleteRatingAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/admin/ratings");
  mutateDb((db) => {
    db.ratings = db.ratings.filter((r) => r.id !== id);
  });
  revalidatePath(back);
  redirect(back);
}

export async function toggleRoleAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (u && u.id !== admin.id) u.role = u.role === "admin" ? "user" : "admin";
  });
  redirect("/admin/users");
}

export async function setSponsoredAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (ai) ai.sponsored = !ai.sponsored;
  });
  revalidatePath("/");
  redirect("/admin/sponsors");
}

export async function setBoostAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const boost = Number(formData.get("boost") ?? 0);
  mutateDb((db) => {
    const ai = db.ai.find((a) => a.id === id);
    if (ai) ai.boost = Number.isFinite(boost) ? boost : 0;
  });
  revalidatePath("/");
  redirect("/admin/sponsors");
}
