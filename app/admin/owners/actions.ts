"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAction } from "@/lib/admin-log";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import {
  applyOwnerChange,
  domainsForAi,
  emailDomain,
  initialsFor,
  normalizeDomain,
  normalizeUsername,
  ownerById,
  usernameTaken,
  revertOwnerChange,
} from "@/lib/owners";
import { canAccess, isStaffRole, resolveRoles } from "@/lib/roles";
import { flushPendingWrites, mutateDb, readDb, refreshDb, uid } from "@/lib/store";
import type { OwnerAccount } from "@/lib/types";

async function assertOwnerAdmin() {
  const user = await getCurrentUser();
  const roles = resolveRoles(readDb().roles);
  if (!user || !isStaffRole(user.role, roles)) redirect("/login?next=/admin/owners");
  if (!canAccess(user.role, "owners", roles)) redirect("/admin?denied=owners");
  return user;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* --------------------------- verification --------------------------- */

/**
 * Creates the owner login after the admin checked the inbox. The proof mail
 * must arrive from the company domain, so the sender address is re-checked here
 * and stored on the request.
 */
export async function verifyOwnerRequestAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const proofFromEmail = String(formData.get("proofFromEmail") ?? "").trim().toLowerCase().slice(0, 160);
  const tier = String(formData.get("tier") ?? "review") === "live" ? "live" : "review";
  const confirmed = formData.get("confirmed") === "on";

  const db = await refreshDb();
  const request = (db.ownerRequests ?? []).find((row) => row.id === requestId);
  if (!request || request.status !== "pending") redirect("/admin/owners?error=request");
  const ai = db.ai.find((row) => row.id === request.aiId);
  if (!ai) redirect("/admin/owners?error=request");

  if (!confirmed) redirect("/admin/owners?error=confirm");
  if (!isEmail(proofFromEmail)) redirect("/admin/owners?error=domain");
  const senderDomain = emailDomain(proofFromEmail);
  const allowed = domainsForAi(ai);
  if (!senderDomain || !(allowed.includes(senderDomain) || senderDomain === request.expectedDomain)) {
    redirect("/admin/owners?error=domain");
  }
  if (username.length < 3) redirect("/admin/owners?error=username");
  if (db.ownerAccounts?.some((row) => row.username === username)) redirect("/admin/owners?error=username");
  if (password.length < 8) redirect("/admin/owners?error=password");
  if (displayName.length < 2) redirect("/admin/owners?error=name");
  if ((db.aiOwners ?? []).some((row) => row.aiId === ai.id)) redirect("/admin/owners?error=owned");

  const passwordHash = await hashPassword(password);
  const ownerId = uid("own");
  const now = new Date().toISOString();

  mutateDb((draft) => {
    const row = (draft.ownerRequests ?? []).find((item) => item.id === requestId);
    if (!row || row.status !== "pending") return;
    const account: OwnerAccount = {
      id: ownerId,
      username,
      displayName,
      email: proofFromEmail,
      passwordHash,
      initials: initialsFor(displayName),
      avatarKey: null,
      avatarVersion: 0,
      mustChangePassword: true,
      status: "active",
      tier,
      sessionVersion: 1,
      verifiedAt: now,
      verifiedFrom: proofFromEmail,
      lastLoginAt: null,
      createdAt: now,
      createdBy: admin.name,
    };
    if (!Array.isArray(draft.ownerAccounts)) draft.ownerAccounts = [];
    draft.ownerAccounts.push(account);

    if (!Array.isArray(draft.aiOwners)) draft.aiOwners = [];
    draft.aiOwners.push({
      id: uid("aio"),
      ownerId,
      aiId: ai.id,
      grantedAt: now,
      grantedBy: admin.name,
    });

    row.status = "verified";
    row.proofFromEmail = proofFromEmail;
    row.reviewedAt = now;
    row.reviewedBy = admin.name;
    row.ownerId = ownerId;
    logAdminAction(
      draft,
      admin,
      "created owner login",
      `AI owner: ${ai.name}`,
      `@${username} · verified from ${proofFromEmail} · ${tier}`,
    );
  });

  await flushPendingWrites();
  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath(`/ai/${ai.slug}`);
  redirect("/admin/owners?saved=owner");
}

export async function rejectOwnerRequestAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);

  mutateDb((db) => {
    const row = (db.ownerRequests ?? []).find((item) => item.id === requestId);
    if (!row || row.status !== "pending") return;
    row.status = "rejected";
    row.reviewedAt = new Date().toISOString();
    row.reviewedBy = admin.name;
    row.note = note;
    logAdminAction(db, admin, "rejected ownership request", row.aiName, `${row.email}${note ? ` · ${note}` : ""}`);
  });
  await flushPendingWrites();
  revalidatePath("/admin/owners");
  redirect("/admin/owners?saved=rejected");
}

/* ----------------------------- account ----------------------------- */

export async function saveOwnerAccountAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const tier = String(formData.get("tier") ?? "review") === "live" ? "live" : "review";
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300);

  if (displayName.length < 2) redirect(`/admin/owners/${id}?error=name`);
  if (username.length < 3) redirect(`/admin/owners/${id}?error=username`);
  if (!isEmail(email)) redirect(`/admin/owners/${id}?error=email`);
  const db = await refreshDb();
  if (usernameTaken(db, username, id)) redirect(`/admin/owners/${id}?error=username`);

  mutateDb((draft) => {
    const row = (draft.ownerAccounts ?? []).find((item) => item.id === id);
    if (!row) return;
    const changes: string[] = [];
    if (row.username !== username) changes.push(`username → @${username}`);
    if (row.email !== email) changes.push(`email → ${email}`);
    if (row.tier !== tier) changes.push(`edits → ${tier}`);
    row.displayName = displayName;
    row.initials = initialsFor(displayName);
    row.username = username;
    row.email = email;
    row.tier = tier;
    row.notes = notes;
    logAdminAction(draft, admin, "updated owner profile", `Owner: @${username}`, changes.join(", ") || notes);
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  redirect(`/admin/owners/${id}?saved=profile`);
}

export async function resetOwnerPasswordAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect(`/admin/owners/${id}?error=password`);

  const passwordHash = await hashPassword(password);
  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === id);
    if (!row) return;
    row.passwordHash = passwordHash;
    row.mustChangePassword = true;
    // Every existing owner session stops working on the next request.
    row.sessionVersion = (row.sessionVersion ?? 0) + 1;
    logAdminAction(db, admin, "reset owner password", `Owner: @${row.username}`, "Sessions signed out");
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  redirect(`/admin/owners/${id}?saved=password`);
}

export async function setOwnerStatusAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "ban");
  const revertAll = formData.get("revertAll") === "on";

  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === id);
    if (!row) return;
    const banning = action === "ban";
    row.status = banning ? "banned" : "active";
    row.bannedAt = banning ? new Date().toISOString() : null;
    row.sessionVersion = (row.sessionVersion ?? 0) + 1;
    let reverted = 0;
    if (banning && revertAll) {
      for (const change of db.ownerChanges ?? []) {
        if (change.ownerId !== id || change.status !== "applied") continue;
        if (revertOwnerChange(db, change)) {
          change.status = "reverted";
          change.reviewedAt = new Date().toISOString();
          change.reviewedBy = admin.name;
          reverted += 1;
        }
      }
    }
    logAdminAction(
      db,
      admin,
      banning ? "banned owner" : "unbanned owner",
      `Owner: @${row.username}`,
      `${revertAll && banning ? `${reverted} changes reverted · ` : ""}content stays live`,
    );
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  revalidatePath("/admin/owners");
  redirect(`/admin/owners/${id}?saved=${action === "ban" ? "banned" : "unbanned"}`);
}

/* ------------------------------ access ----------------------------- */

export async function grantOwnerAiAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  const aiId = String(formData.get("aiId") ?? "");
  const db = await refreshDb();
  const owner = ownerById(db, id);
  const ai = db.ai.find((row) => row.id === aiId);
  if (!owner || !ai) redirect(`/admin/owners/${id}?error=ai`);
  if ((db.aiOwners ?? []).some((row) => row.aiId === aiId)) redirect(`/admin/owners/${id}?error=owned`);

  mutateDb((draft) => {
    const row = (draft.ownerAccounts ?? []).find((item) => item.id === id);
    if (!row) return;
    if (!Array.isArray(draft.aiOwners)) draft.aiOwners = [];
    draft.aiOwners.push({
      id: uid("aio"),
      ownerId: id,
      aiId,
      grantedAt: new Date().toISOString(),
      grantedBy: admin.name,
    });
    logAdminAction(draft, admin, "granted listing", `Owner: @${row.username}`, ai.name);
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  revalidatePath(`/ai/${ai.slug}`);
  redirect(`/admin/owners/${id}?saved=granted`);
}

export async function revokeOwnerAiAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  const aiId = String(formData.get("aiId") ?? "");

  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === id);
    const ai = db.ai.find((item) => item.id === aiId);
    db.aiOwners = (db.aiOwners ?? []).filter((item) => !(item.ownerId === id && item.aiId === aiId));
    if (row) logAdminAction(db, admin, "revoked listing", `Owner: @${row.username}`, ai?.name ?? aiId);
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  redirect(`/admin/owners/${id}?saved=revoked`);
}

/** Allowed owner-email domains for one listing (the claim form checks these). */
export async function saveAiOwnerDomainsAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("ownerId") ?? "");
  const aiId = String(formData.get("aiId") ?? "");
  const raw = String(formData.get("domains") ?? "");
  const inputs = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);

  const normalized: string[] = [];
  for (const input of inputs) {
    const domain = normalizeDomain(input);
    if (!domain) redirect(`/admin/owners/${id}?error=domain`);
    normalized.push(domain);
  }

  mutateDb((db) => {
    const ai = db.ai.find((row) => row.id === aiId);
    if (!ai) return;
    ai.ownerDomains = [...new Set(normalized)];
    logAdminAction(
      db,
      admin,
      "updated owner domains",
      `AI: ${ai.name}`,
      normalized.length ? normalized.join(", ") : "fallback to listing website",
    );
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${id}`);
  revalidatePath("/owner/claim");
  redirect(`/admin/owners/${id}?saved=domains`);
}

export async function deleteOwnerAccountAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const id = String(formData.get("id") ?? "");
  mutateDb((db) => {
    const row = (db.ownerAccounts ?? []).find((item) => item.id === id);
    if (!row) return;
    db.ownerAccounts = (db.ownerAccounts ?? []).filter((item) => item.id !== id);
    db.aiOwners = (db.aiOwners ?? []).filter((item) => item.ownerId !== id);
    for (const change of db.ownerChanges ?? []) {
      if (change.ownerId === id) change.deletedAt = change.deletedAt ?? new Date().toISOString();
    }
    logAdminAction(db, admin, "deleted owner login", `Owner: @${row.username}`, "Audit trail kept");
  });
  await flushPendingWrites();
  revalidatePath("/admin/owners");
  redirect("/admin/owners?saved=deleted");
}

/* ----------------------------- changes ----------------------------- */

export async function decideOwnerChangeAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const changeId = String(formData.get("changeId") ?? "");
  const decision = String(formData.get("decision") ?? "reject");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const ownerId = String(formData.get("ownerId") ?? "");
  let slug = "";

  mutateDb((db) => {
    const change = (db.ownerChanges ?? []).find((row) => row.id === changeId);
    if (!change || change.status !== "pending") return;
    change.reviewedAt = new Date().toISOString();
    change.reviewedBy = admin.name;
    change.note = note;
    if (decision === "approve") {
      if (!applyOwnerChange(db, change)) {
        change.status = "rejected";
        change.note = note || "Target no longer exists.";
      } else {
        change.status = "applied";
        logAdminAction(db, admin, "approved owner change", `${change.aiName} · ${change.title}`, change.ownerName);
      }
    } else {
      change.status = "rejected";
      logAdminAction(db, admin, "rejected owner change", `${change.aiName} · ${change.title}`, change.ownerName);
    }
    slug = db.ai.find((row) => row.id === change.aiId)?.slug ?? "";
  });
  await flushPendingWrites();
  if (slug) revalidatePath(`/ai/${slug}`);
  revalidatePath(`/admin/owners/${ownerId}`);
  redirect(`/admin/owners/${ownerId}?saved=change`);
}

export async function revertOwnerChangeAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const changeId = String(formData.get("changeId") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  let slug = "";

  mutateDb((db) => {
    const change = (db.ownerChanges ?? []).find((row) => row.id === changeId);
    if (!change || change.status !== "applied") return;
    change.reviewedAt = new Date().toISOString();
    change.reviewedBy = admin.name;
    if (revertOwnerChange(db, change)) {
      change.status = "reverted";
      logAdminAction(db, admin, "reverted owner change", `${change.aiName} · ${change.title}`, change.ownerName);
    }
    slug = db.ai.find((row) => row.id === change.aiId)?.slug ?? "";
  });
  await flushPendingWrites();
  if (slug) revalidatePath(`/ai/${slug}`);
  revalidatePath(`/admin/owners/${ownerId}`);
  redirect(`/admin/owners/${ownerId}?saved=reverted`);
}

/** Soft delete: the audit row stays, it just leaves the owner's list. */
export async function hideOwnerChangeAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const changeId = String(formData.get("changeId") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  mutateDb((db) => {
    const change = (db.ownerChanges ?? []).find((row) => row.id === changeId);
    if (!change) return;
    change.deletedAt = new Date().toISOString();
    logAdminAction(db, admin, "hid owner change", `${change.aiName} · ${change.title}`, change.ownerName);
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${ownerId}`);
  redirect(`/admin/owners/${ownerId}?saved=hidden`);
}

export async function restoreOwnerChangeAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const changeId = String(formData.get("changeId") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  mutateDb((db) => {
    const change = (db.ownerChanges ?? []).find((row) => row.id === changeId);
    if (!change) return;
    change.deletedAt = null;
    logAdminAction(db, admin, "restored owner change", `${change.aiName} · ${change.title}`, change.ownerName);
  });
  await flushPendingWrites();
  revalidatePath(`/admin/owners/${ownerId}`);
  redirect(`/admin/owners/${ownerId}?saved=restored`);
}

export async function revertAllOwnerChangesAction(formData: FormData): Promise<void> {
  const admin = await assertOwnerAdmin();
  const ownerId = String(formData.get("ownerId") ?? "");
  const slugs = new Set<string>();
  mutateDb((db) => {
    const owner = (db.ownerAccounts ?? []).find((row) => row.id === ownerId);
    let reverted = 0;
    for (const change of db.ownerChanges ?? []) {
      if (change.ownerId !== ownerId || change.status !== "applied") continue;
      if (revertOwnerChange(db, change)) {
        change.status = "reverted";
        change.reviewedAt = new Date().toISOString();
        change.reviewedBy = admin.name;
        reverted += 1;
        const ai = db.ai.find((row) => row.id === change.aiId);
        if (ai) slugs.add(ai.slug);
      }
    }
    logAdminAction(db, admin, "reverted all owner changes", `Owner: @${owner?.username ?? ownerId}`, `${reverted} applied changes`);
  });
  await flushPendingWrites();
  for (const slug of slugs) revalidatePath(`/ai/${slug}`);
  revalidatePath(`/admin/owners/${ownerId}`);
  redirect(`/admin/owners/${ownerId}?saved=reverted-all`);
}
