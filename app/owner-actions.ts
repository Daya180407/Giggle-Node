"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestIp } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { deleteAsset, putAsset } from "@/lib/assets";
import { pushNotification } from "@/lib/notify";
import { clearOwnerSession, requireOwner, startOwnerSession, verifyOwnerCredentials } from "@/lib/owner-auth";
import {
  domainsForAi,
  emailDomain,
  emailMatchesAi,
  initialsFor,
  MAX_OWNER_DRAFTS,
  normalizeUsername,
  ownerDrafts,
  ownsAi,
  pendingRequestFor,
  priceChangeWindow,
  proofCode,
  recordOwnerChange,
} from "@/lib/owners";
import type { OwnerFormState } from "@/lib/owner-forms";
import { getSiteSettings } from "@/lib/settings";
import { flushPendingWrites, mutateDb, readDb, refreshDb, uid } from "@/lib/store";
import type { Model, Post, PriceType, SubscriptionPlan } from "@/lib/types";


const OWNER_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const OWNER_LOGIN_MAX_ATTEMPTS = 8;
const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLAIM_MAX_PER_IP = 5;
const MAX_AVATAR_BYTES = 400_000;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, taken: string[]): string {
  let slug = base || "item";
  let i = 2;
  while (taken.includes(slug)) slug = `${base}-${i++}`;
  return slug;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function priceNumber(value: FormDataEntryValue | null): number {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function countEvents(
  db: ReturnType<typeof readDb>,
  kind: "owner-login" | "owner-claim",
  matcher: (event: { ip: string; who?: string }) => boolean,
  windowMs: number,
): number {
  const cutoff = Date.now() - windowMs;
  return (db.authEvents ?? []).filter(
    (event) => event.kind === kind && +new Date(event.at) > cutoff && matcher(event),
  ).length;
}

/* ---------------------------- owner claim ---------------------------- */

/** Public: a company asks to manage their listing and gets a proof code. */
export async function submitOwnerClaimAction(
  _prev: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const aiId = String(formData.get("aiId") ?? "");
  const applicantName = String(formData.get("applicantName") ?? "").trim().slice(0, 80);
  const company = String(formData.get("company") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);

  if (applicantName.length < 2) return { ok: false, error: "Please enter your name." };
  if (!isEmail(email)) return { ok: false, error: "Please enter a valid work email." };
  if (!aiId) return { ok: false, error: "Pick the listing you manage." };

  const ip = await requestIp();
  const db = await refreshDb();
  const ai = db.ai.find((row) => row.id === aiId);
  if (!ai) return { ok: false, error: "That listing no longer exists." };

  const existingOwner = (db.aiOwners ?? []).find((row) => row.aiId === aiId);
  if (existingOwner) {
    return { ok: false, error: "This listing already has an owner login. Contact support if that is wrong." };
  }

  const allowed = domainsForAi(ai);
  if (!allowed.length) {
    return { ok: false, error: "This listing has no official website on file, so ownership cannot be verified yet." };
  }
  const domain = emailDomain(email);
  if (!domain || !emailMatchesAi(ai, email)) {
    return {
      ok: false,
      error: `Email must come from the company domain (${allowed.join(" or ")}), not a free mailbox.`,
    };
  }

  if (countEvents(db, "owner-claim", (event) => event.ip === ip, CLAIM_WINDOW_MS) >= CLAIM_MAX_PER_IP) {
    return { ok: false, error: "Too many requests from this connection. Please try again tomorrow." };
  }

  const pending = pendingRequestFor(db, aiId, email);
  if (pending) {
    return {
      ok: true,
      message: "You already have a pending request. Send the code below from your company email.",
      code: pending.proofCode,
      inbox: getSiteSettings(db).supportEmail,
      domain,
      aiName: ai.name,
    };
  }

  const code = proofCode();
  const requestId = uid("orq");

  mutateDb((draft) => {
    if (!Array.isArray(draft.ownerRequests)) draft.ownerRequests = [];
    draft.ownerRequests.unshift({
      id: requestId,
      aiId,
      aiName: ai.name,
      applicantName,
      company,
      email,
      expectedDomain: domain,
      proofCode: code,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    });
    draft.ownerRequests = draft.ownerRequests.slice(0, 200);
    draft.authEvents.push({ ip, at: new Date().toISOString(), kind: "owner-claim", who: email });
    pushNotification(draft, {
      title: `Ownership request: ${ai.name}`,
      body: `${applicantName}${company ? ` (${company})` : ""} wants to manage this listing. Check the inbox for code ${code}.`,
      href: "/admin/owners",
      kind: "system",
      audience: "staff",
    });
  });
  await flushPendingWrites();
  revalidatePath("/admin/owners");

  return {
    ok: true,
    message: "Request received. Now email the code below from your company address.",
    code,
    inbox: getSiteSettings(readDb()).supportEmail,
    domain,
    aiName: ai.name,
  };
}

/* ------------------------------ login ------------------------------ */

export async function ownerLoginAction(_prev: OwnerFormState, formData: FormData): Promise<OwnerFormState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { ok: false, error: "Enter your username and password." };

  const ip = await requestIp();
  const db = await refreshDb();
  const ipAttempts = countEvents(db, "owner-login", (event) => event.ip === ip, OWNER_LOGIN_WINDOW_MS);
  const accountAttempts = countEvents(
    db,
    "owner-login",
    (event) => event.who === username,
    OWNER_LOGIN_WINDOW_MS,
  );
  if (ipAttempts >= OWNER_LOGIN_MAX_ATTEMPTS || accountAttempts >= OWNER_LOGIN_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Please try again in 15 minutes." };
  }

  const owner = await verifyOwnerCredentials(db, username, password);
  if (!owner) {
    mutateDb((draft) => {
      draft.authEvents.push({ ip, at: new Date().toISOString(), kind: "owner-login", who: username });
      draft.authEvents = draft.authEvents.slice(-4000);
    });
    return { ok: false, error: "Incorrect username or password." };
  }

  mutateDb((draft) => {
    const row = (draft.ownerAccounts ?? []).find((item) => item.id === owner.id);
    if (row) row.lastLoginAt = new Date().toISOString();
  });
  await flushPendingWrites();
  await startOwnerSession(owner);
  redirect("/owner");
}

export async function ownerLogoutAction(): Promise<void> {
  await clearOwnerSession();
  redirect("/owner/login");
}

/* ----------------------------- profile ----------------------------- */

export async function saveOwnerProfileAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (displayName.length < 2) redirect("/owner/profile?error=name");
  if (newPassword) {
    if (newPassword.length < 8) redirect("/owner/profile?error=short");
    if (newPassword !== confirmPassword) redirect("/owner/profile?error=match");
    const db = await refreshDb();
    const fresh = (db.ownerAccounts ?? []).find((row) => row.id === owner.id);
    if (!fresh || !(await verifyPassword(currentPassword, fresh.passwordHash))) {
      redirect("/owner/profile?error=current");
    }
  }

  const passwordHash = newPassword ? await hashPassword(newPassword) : null;
  let nextOwner = owner;

  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === owner.id);
    if (!row) return;
    row.displayName = displayName;
    row.initials = initialsFor(displayName);
    if (passwordHash) {
      row.passwordHash = passwordHash;
      row.mustChangePassword = false;
      // Invalidate every other session, then re-issue this browser's cookie.
      row.sessionVersion = (row.sessionVersion ?? 0) + 1;
      nextOwner = { ...row };
    }
  });
  await flushPendingWrites();
  if (passwordHash) await startOwnerSession(nextOwner);
  revalidatePath("/owner/profile");
  redirect(`/owner/profile?saved=${passwordHash ? "password" : "profile"}`);
}

function decodeAvatar(value: string): { bytes: Uint8Array; ext: string; mime: string } | null {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value.trim());
  if (!match) return null;
  const rawMime = match[1] === "jpg" ? "jpeg" : match[1];
  const mime = `image/${rawMime}`;
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) return null;
  return { bytes, ext: rawMime === "jpeg" ? "jpg" : rawMime, mime };
}

export async function saveOwnerAvatarAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const decoded = decodeAvatar(String(formData.get("dataUrl") ?? ""));
  if (!decoded) redirect("/owner/profile?error=image");

  const version = (owner.avatarVersion ?? 0) + 1;
  const key = `owner-avatars/${owner.id}/${version}.${decoded.ext}`;
  const stored = await putAsset(key, decoded.bytes, decoded.mime);
  if (!stored) redirect("/owner/profile?error=storage");

  const previousKey = owner.avatarKey ?? null;
  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === owner.id);
    if (!row) return;
    row.avatarKey = key;
    row.avatarVersion = version;
  });
  await flushPendingWrites();
  if (previousKey && previousKey !== key) await deleteAsset(previousKey);
  revalidatePath("/owner/profile");
  revalidatePath("/owner");
  redirect("/owner/profile?saved=avatar");
}

export async function removeOwnerAvatarAction(): Promise<void> {
  const owner = await requireOwner();
  const previousKey = owner.avatarKey ?? null;
  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === owner.id);
    if (!row) return;
    row.avatarKey = null;
    row.avatarVersion = (row.avatarVersion ?? 0) + 1;
  });
  await flushPendingWrites();
  if (previousKey) await deleteAsset(previousKey);
  revalidatePath("/owner/profile");
  redirect("/owner/profile?saved=avatar");
}

/* ------------------------------ plans ------------------------------ */

function ownedAiOrRedirect(ownerId: string, aiId: string) {
  const db = readDb();
  const ai = db.ai.find((row) => row.id === aiId);
  if (!ai || !ownsAi(db, ownerId, aiId)) return null;
  return ai;
}

/** Reads repeatable plan rows, keeping the stable id of a plan that already exists. */
function readOwnerPlans(formData: FormData, existing: SubscriptionPlan[]): SubscriptionPlan[] {
  const ids = formData.getAll("planId").map(String);
  const names = formData.getAll("planName").map(String);
  const monthly = formData.getAll("planPrice").map(String);
  const inr = formData.getAll("planPriceInr").map(String);
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
    const wantedId = ids[index]?.trim() ?? "";
    const match =
      existing.find((plan) => plan.id === wantedId) ??
      existing.find((plan) => plan.name.toLowerCase() === key);
    const monthlyPrice = priceNumber(monthly[index] ?? null);
    const inrPrice = priceNumber(inr[index] ?? null);
    const yearlyPrice = priceNumber(yearly[index] ?? null);
    plans.push({
      id: match?.id ?? `plan_${slugify(name)}`,
      name,
      priceMonthly: monthlyPrice,
      priceYearly: yearlyPrice > 0 ? yearlyPrice : null,
      priceInr: inrPrice > 0 ? Math.round(inrPrice) : null,
      note: (notes[index] ?? "").trim().slice(0, 140),
    });
  });

  return plans.slice(0, 6);
}

export async function saveOwnerPlansAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const aiId = String(formData.get("aiId") ?? "");
  const ai = ownedAiOrRedirect(owner.id, aiId);
  if (!ai) redirect("/owner");

  const before = JSON.parse(JSON.stringify(ai.plans ?? [])) as SubscriptionPlan[];
  const after = readOwnerPlans(formData, before);
  if (!after.length) redirect(`/owner/ai/${ai.id}?error=plans`);

  // Plan deletion stays admin-only: every existing plan must still be present.
  const missing = before.find((plan) => !after.some((row) => row.id === plan.id));
  if (missing) redirect(`/owner/ai/${ai.id}?error=plan-delete`);

  mutateDb((db) => {
    const target = db.ai.find((row) => row.id === ai.id);
    if (!target) return;
    recordOwnerChange(db, owner, {
      ai: target,
      kind: "plans",
      targetId: target.id,
      title: "Subscription plans",
      summary: `${after.length} plan${after.length === 1 ? "" : "s"}: ${after
        .map((plan) => plan.name)
        .join(", ")}`,
      before,
      after,
    });
  });
  await flushPendingWrites();
  revalidatePath(`/ai/${ai.slug}`);
  revalidatePath(`/owner/ai/${ai.id}`);
  redirect(`/owner/ai/${ai.id}?saved=plans`);
}

/* ------------------------------ price ------------------------------ */

export async function saveOwnerPriceAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const aiId = String(formData.get("aiId") ?? "");
  const ai = ownedAiOrRedirect(owner.id, aiId);
  if (!ai) redirect("/owner");

  const planPrice = priceNumber(formData.get("planPrice"));
  const planPriceInr = priceNumber(formData.get("planPriceInr"));
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim().slice(0, 300);
  if (!isHttpUrl(sourceUrl)) redirect(`/owner/ai/${ai.id}?error=source`);

  const window = priceChangeWindow(readDb(), ai.id);
  if (!window.allowed) redirect(`/owner/ai/${ai.id}?error=price-window`);

  const before = { planPrice: Number(ai.planPrice) || 0, planPriceInr: Number(ai.planPriceInr) || 0 };
  const after = { planPrice, planPriceInr };

  mutateDb((db) => {
    const target = db.ai.find((row) => row.id === ai.id);
    if (!target) return;
    recordOwnerChange(db, owner, {
      ai: target,
      kind: "price",
      targetId: target.id,
      title: "Starting price",
      summary: `$${before.planPrice}/mo → $${planPrice}/mo`,
      before,
      after,
      sourceUrl,
    });
  });
  await flushPendingWrites();
  revalidatePath(`/ai/${ai.slug}`);
  revalidatePath(`/owner/ai/${ai.id}`);
  redirect(`/owner/ai/${ai.id}?saved=price`);
}

/* ------------------------------ models ----------------------------- */

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function saveOwnerModelAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const aiId = String(formData.get("aiId") ?? "");
  const ai = ownedAiOrRedirect(owner.id, aiId);
  if (!ai) redirect("/owner");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect(`/owner/ai/${ai.id}?error=model`);

  const db = readDb();
  const existing = id ? db.models.find((row) => row.id === id && row.aiId === ai.id) ?? null : null;
  if (id && !existing) redirect(`/owner/ai/${ai.id}?error=model`);

  const useCustomPricing = formData.get("pricingCustom") === "on";
  const pricingSource = String(formData.get("pricingSource") ?? "").trim().slice(0, 300);
  if (useCustomPricing && !isHttpUrl(pricingSource)) {
    redirect(`/owner/ai/${ai.id}?error=source`);
  }

  const pricingChanged =
    useCustomPricing &&
    JSON.stringify(existing?.pricing ?? null) !==
      JSON.stringify({
        available: formData.get("pricingAvailable") === "on",
        input: optionalNumber(formData.get("pricingInput")),
        output: optionalNumber(formData.get("pricingOutput")),
        unit: String(formData.get("pricingUnit") ?? "1M tokens").slice(0, 20),
        contextWindow: optionalNumber(formData.get("pricingContext")),
        note: String(formData.get("pricingNote") ?? "").trim().slice(0, 200),
        source: pricingSource,
      });
  if (pricingChanged) {
    const check = priceChangeWindow(db, existing?.id ?? `new:${ai.id}`);
    if (!check.allowed) redirect(`/owner/ai/${ai.id}?error=price-window`);
  }

  const taken = db.models.filter((row) => row.aiId === ai.id && row.id !== id).map((row) => row.slug);
  const slug = uniqueSlug(slugify(String(formData.get("slug") ?? "") || name), taken);
  const after: Model = {
    id: existing?.id ?? `mdl_${slug}_${Date.now().toString(36)}`,
    aiId: ai.id,
    name,
    slug,
    description: String(formData.get("description") ?? "").trim().slice(0, 600),
    launchDate: String(formData.get("launchDate") ?? "") || existing?.launchDate || new Date().toISOString().slice(0, 10),
    bestFor: String(formData.get("bestFor") ?? "").trim().slice(0, 200),
    priceType: (String(formData.get("priceType") ?? existing?.priceType ?? "freemium") as PriceType) ?? "freemium",
    pin: existing?.pin,
    editorRating: existing?.editorRating ?? null,
    demoStars: existing?.demoStars ?? null,
    demoVotes: existing?.demoVotes ?? null,
    pricing: useCustomPricing
      ? {
          available: formData.get("pricingAvailable") === "on",
          input: optionalNumber(formData.get("pricingInput")),
          output: optionalNumber(formData.get("pricingOutput")),
          unit: String(formData.get("pricingUnit") ?? "1M tokens").slice(0, 20),
          contextWindow: optionalNumber(formData.get("pricingContext")),
          note: String(formData.get("pricingNote") ?? "").trim().slice(0, 200),
          source: pricingSource,
        }
      : null,
  };
  const before = existing ? (JSON.parse(JSON.stringify(existing)) as Model) : null;

  mutateDb((draft) => {
    const target = draft.ai.find((row) => row.id === ai.id);
    if (!target) return;
    recordOwnerChange(draft, owner, {
      ai: target,
      kind: "model",
      targetId: after.id,
      title: existing ? `Model: ${name}` : `New model: ${name}`,
      summary: `${after.priceType} · ${useCustomPricing ? `API ${after.pricing?.unit ?? ""} pricing updated` : "no custom API price"}`,
      before,
      after,
      sourceUrl: useCustomPricing ? pricingSource : undefined,
    });
  });
  await flushPendingWrites();
  revalidatePath(`/ai/${ai.slug}`);
  revalidatePath(`/owner/ai/${ai.id}`);
  redirect(`/owner/ai/${ai.id}?saved=model`);
}

/* ------------------------------ posts ------------------------------ */

export async function saveOwnerPostAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const excerpt = String(formData.get("excerpt") ?? "").trim().slice(0, 300);
  const content = String(formData.get("content") ?? "").slice(0, 20000).trim();
  const coverEmoji = String(formData.get("coverEmoji") ?? "📰").slice(0, 4) || "📰";
  if (title.length < 4) redirect(`/owner/posts${id ? `/${id}` : "/new"}?error=title`);
  if (content.length < 40) redirect(`/owner/posts${id ? `/${id}` : "/new"}?error=content`);

  const db = readDb();
  const ownedIds = new Set((db.aiOwners ?? []).filter((row) => row.ownerId === owner.id).map((row) => row.aiId));
  const related = formData
    .getAll("relatedAiIds")
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter((value) => ownedIds.has(value));
  const primaryAiId = related[0] ?? [...ownedIds][0] ?? "";
  const ai = db.ai.find((row) => row.id === primaryAiId);
  if (!ai) redirect("/owner/posts?error=ai");

  const existing = id ? db.posts.find((row) => row.id === id) : null;
  if (id && (!existing || existing.ownerId !== owner.id)) redirect("/owner/posts?error=post");
  if (!id && ownerDrafts(db, owner.id).length >= MAX_OWNER_DRAFTS) {
    redirect("/owner/posts?error=drafts");
  }

  const taken = db.posts.filter((row) => row.id !== id).map((row) => row.slug);
  const after: Post = {
    id: existing?.id ?? uid("post"),
    title,
    slug: existing?.slug ?? uniqueSlug(slugify(title), taken),
    coverImage: existing?.coverImage ?? "",
    coverEmoji,
    excerpt,
    content,
    type: "news",
    relatedAiIds: related,
    // Owners never publish: an editor reviews the draft in the admin panel.
    status: "draft",
    author: owner.displayName,
    sponsored: false,
    ownerId: owner.id,
    ownerName: owner.displayName,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    featured: false,
    seoTitle: existing?.seoTitle ?? null,
    seoDescription: existing?.seoDescription ?? null,
    views: existing?.views ?? 0,
    html: null,
  };
  const before = existing ? (JSON.parse(JSON.stringify(existing)) as Post) : null;

  mutateDb((draft) => {
    const target = draft.ai.find((row) => row.id === ai.id);
    if (!target) return;
    recordOwnerChange(draft, owner, {
      ai: target,
      kind: "post",
      targetId: after.id,
      title: `Draft: ${title}`,
      summary: excerpt || content.slice(0, 140),
      before,
      after,
    });
  });
  await flushPendingWrites();
  revalidatePath("/owner/posts");
  redirect(`/owner/posts?saved=${existing ? "updated" : "created"}`);
}

export async function deleteOwnerPostAction(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const db = readDb();
  const post = db.posts.find((row) => row.id === id && row.ownerId === owner.id);
  if (!post || post.status !== "draft") redirect("/owner/posts?error=post");
  mutateDb((draft) => {
    const copy = draft.posts.find((row) => row.id === post.id);
    if (!copy) return;
    draft.posts = draft.posts.filter((row) => row.id !== copy.id);
    const target = draft.ai.find((row) => row.id === (copy.relatedAiIds[0] ?? ""));
    if (!target) return;
    recordOwnerChange(draft, owner, {
      ai: target,
      kind: "post",
      targetId: copy.id,
      title: `Deleted draft: ${copy.title}`,
      summary: "Owner deleted their own unpublished draft.",
      before: copy,
      after: null,
    });
  });
  await flushPendingWrites();
  revalidatePath("/owner/posts");
  redirect("/owner/posts?saved=deleted");
}
