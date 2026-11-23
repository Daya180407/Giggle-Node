import Link from "next/link";
import { notFound } from "next/navigation";
import {
  decideOwnerChangeAction,
  deleteOwnerAccountAction,
  grantOwnerAiAction,
  hideOwnerChangeAction,
  resetOwnerPasswordAction,
  restoreOwnerChangeAction,
  revertAllOwnerChangesAction,
  revertOwnerChangeAction,
  revokeOwnerAiAction,
  saveAiOwnerDomainsAction,
  saveOwnerAccountAction,
  setOwnerStatusAction,
} from "@/app/admin/owners/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { requireAreaPage } from "@/lib/permissions";
import {
  aiIdsForOwner,
  avatarSrc,
  domainsForAi,
  listOwnerRequests,
  ownerById,
} from "@/lib/owners";
import { refreshDb } from "@/lib/store";
import type { OwnerChange } from "@/lib/types";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  profile: "Profile saved.",
  password: "Password reset. Every owner session was signed out.",
  banned: "Owner banned — they cannot sign in, existing edits stay live unless you reverted them.",
  unbanned: "Owner can sign in again.",
  granted: "Listing granted.",
  revoked: "Listing access revoked.",
  domains: "Owner domains updated.",
  change: "Change reviewed.",
  reverted: "Change reverted to the previous snapshot.",
  "reverted-all": "Every applied change was reverted.",
  hidden: "Change record hidden from the owner list (audit kept).",
  restored: "Change record restored.",
};

const ERRORS: Record<string, string> = {
  name: "Display name must be at least 2 characters.",
  username: "Pick a unique username of at least 3 characters.",
  email: "Enter a valid email address.",
  password: "The password must be at least 8 characters.",
  ai: "That listing does not exist.",
  owned: "Another owner login already holds that listing.",
  domain: "Enter real company domains — free mailboxes (gmail, outlook, …) are rejected.",
};

function snapshotText(value: unknown): string {
  if (value === null || value === undefined) return "— (nothing)";
  try {
    return JSON.stringify(value, null, 2).slice(0, 1600);
  } catch {
    return "—";
  }
}

function changeStatusChip(change: OwnerChange) {
  if (change.deletedAt) return "bg-slate-100 text-slate-500";
  if (change.status === "applied") return "bg-emerald-50 text-emerald-700";
  if (change.status === "pending") return "bg-amber-50 text-amber-700";
  if (change.status === "reverted") return "bg-rose-50 text-rose-600";
  return "bg-slate-100 text-slate-500";
}

export default async function AdminOwnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("owners");
  const { id } = await params;
  const { saved, error } = await searchParams;
  const db = await refreshDb();
  const owner = ownerById(db, id);
  if (!owner) notFound();

  const aiIds = aiIdsForOwner(db, owner.id);
  const ais = db.ai.filter((ai) => aiIds.includes(ai.id));
  const grantable = db.ai.filter((ai) => !(db.aiOwners ?? []).some((row) => row.aiId === ai.id));
  const changes = (db.ownerChanges ?? [])
    .filter((row) => row.ownerId === owner.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const pendingChanges = changes.filter((row) => row.status === "pending" && !row.deletedAt);
  const appliedChanges = changes.filter((row) => row.status === "applied" && !row.deletedAt);
  const requests = listOwnerRequests(db).filter((row) => row.ownerId === owner.id);
  const src = avatarSrc(owner);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/owners" className="text-[11px] font-semibold text-brand hover:underline">
          ← AI owners
        </Link>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
              {owner.initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-lg font-bold text-ink">
              {owner.displayName}
              <span className="chip bg-emerald-50 text-emerald-700">✓ Verified owner</span>
              <span
                className={`chip ${
                  owner.status === "banned"
                    ? "bg-rose-50 text-rose-600"
                    : owner.tier === "review"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {owner.status === "banned" ? "banned" : `${owner.tier} edits`}
              </span>
            </p>
            <p className="text-[11px] text-muted">
              @{owner.username} · {owner.email} · verified from {owner.verifiedFrom ?? "—"} on{" "}
              {owner.verifiedAt ? new Date(owner.verifiedAt).toLocaleDateString("en-IN") : "—"}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
            <span className={`chip ${pendingChanges.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
              {pendingChanges.length} pending
            </span>
            <span className="chip bg-emerald-50 text-emerald-700">{appliedChanges.length} applied</span>
            <span className="chip bg-slate-100 text-slate-600">{ais.length} listings</span>
          </div>
        </div>

        {saved && SAVED[saved] ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {SAVED[saved]}
          </p>
        ) : null}
        {error && ERRORS[error] ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {ERRORS[error]}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="text-sm font-bold">Profile</h3>
          <form action={saveOwnerAccountAction} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={owner.id} />
            <label className="block text-[11px] font-semibold text-slate-600">
              Display name
              <input name="displayName" required defaultValue={owner.displayName} maxLength={60} className="field mt-1 w-full" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] font-semibold text-slate-600">
                Username
                <input name="username" required defaultValue={owner.username} maxLength={32} className="field mt-1 w-full" />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Email
                <input name="email" type="email" required defaultValue={owner.email} maxLength={160} className="field mt-1 w-full" />
              </label>
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Editing mode
              <select name="tier" defaultValue={owner.tier} className="field mt-1 w-full">
                <option value="review">Review — owner changes need approval</option>
                <option value="live">Live — owner changes apply at once</option>
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              Internal notes
              <input name="notes" defaultValue={owner.notes ?? ""} maxLength={300} className="field mt-1 w-full" />
            </label>
            <button className="btn btn-primary !py-1.5 text-xs">Save profile</button>
          </form>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-bold">Access &amp; security</h3>

          <form action={resetOwnerPasswordAction} className="mt-2 flex flex-wrap items-end gap-1.5">
            <input type="hidden" name="id" value={owner.id} />
            <label className="block text-[11px] font-semibold text-slate-600">
              New password (8+)
              <input name="password" type="password" required minLength={8} className="field mt-1 !w-56" />
            </label>
            <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reset password</button>
            <span className="text-[10.5px] text-muted">Signs out every owner session.</span>
          </form>

          <form action={setOwnerStatusAction} className="mt-3 space-y-1.5 border-t border-line/70 pt-3">
            <input type="hidden" name="id" value={owner.id} />
            <input type="hidden" name="action" value={owner.status === "banned" ? "unban" : "ban"} />
            {owner.status === "banned" ? (
              <p className="text-[11px] text-muted">Banned {owner.bannedAt ? new Date(owner.bannedAt).toLocaleDateString("en-IN") : ""}. Content stayed live.</p>
            ) : (
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                <input type="checkbox" name="revertAll" className="h-3.5 w-3.5 accent-rose-600" />
                Also revert every applied change
              </label>
            )}
            <button
              className={`btn !px-3 !py-1 text-[11px] ${
                owner.status === "banned"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "btn-ghost text-rose-600"
              }`}
            >
              {owner.status === "banned" ? "Unban owner" : "Ban owner"}
            </button>
            <p className="text-[10.5px] leading-relaxed text-muted">
              A ban blocks the login only; the listing stays live. Reverting is optional.
            </p>
          </form>

          <form action={deleteOwnerAccountAction} className="mt-3 border-t border-line/70 pt-3">
            <input type="hidden" name="id" value={owner.id} />
            <DeleteButton
              label="Delete owner login"
              message={`Delete ${owner.displayName}'s owner login, access and profile? The audit trail is kept.`}
            />
            <p className="mt-1 text-[10.5px] text-muted">
              Listings stay live and become owner-less; the change history is hidden, not deleted.
            </p>
          </form>
        </section>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Listings they can edit</h3>
          <span className="text-[11px] text-muted">One owner login per listing</span>
        </div>

        <div className="mt-2 space-y-2">
          {ais.map((ai) => {
            const effective = domainsForAi(ai);
            return (
              <div key={ai.id} className="rounded-xl border border-line/70 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/ai/${ai.slug}`} className="font-semibold text-ink hover:text-brand">
                    {ai.name} ↗
                  </Link>
                  <span className="text-muted">${ai.planPrice}/mo · {ai.plans?.length ?? 0} plans</span>
                  <form action={revokeOwnerAiAction} className="ml-auto">
                    <input type="hidden" name="id" value={owner.id} />
                    <input type="hidden" name="aiId" value={ai.id} />
                    <button className="text-[11px] font-semibold text-rose-600 hover:underline">Revoke access</button>
                  </form>
                </div>
                <form action={saveAiOwnerDomainsAction} className="mt-2 flex flex-wrap items-end gap-1.5">
                  <input type="hidden" name="ownerId" value={owner.id} />
                  <input type="hidden" name="aiId" value={ai.id} />
                  <label className="block flex-1 text-[11px] font-semibold text-slate-600">
                    Allowed owner-email domains
                    <input
                      name="domains"
                      defaultValue={(ai.ownerDomains ?? []).join(", ")}
                      placeholder={effective.join(", ") || "add the company domain"}
                      className="field mt-1 w-full"
                    />
                  </label>
                  <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Save domains</button>
                  <p className="w-full text-[10.5px] text-muted">
                    Effective now: {effective.length ? effective.join(", ") : "none — the claim form is closed for this listing"}.
                    Free mailboxes are rejected.
                  </p>
                </form>
              </div>
            );
          })}
          {ais.length === 0 ? <p className="text-xs text-muted">No listing assigned yet.</p> : null}
        </div>

        {grantable.length ? (
          <form action={grantOwnerAiAction} className="mt-3 flex flex-wrap items-end gap-1.5 border-t border-line/70 pt-3">
            <input type="hidden" name="id" value={owner.id} />
            <label className="block text-[11px] font-semibold text-slate-600">
              Grant another listing
              <select name="aiId" className="field mt-1 !w-64" defaultValue="">
                <option value="" disabled>
                  Choose an AI
                </option>
                {grantable.map((ai) => (
                  <option key={ai.id} value={ai.id}>
                    {ai.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary !px-3 !py-1 text-[11px]">Grant</button>
          </form>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Changes &amp; audit</h3>
          <div className="flex flex-wrap items-center gap-2">
            {appliedChanges.length ? (
              <form action={revertAllOwnerChangesAction}>
                <input type="hidden" name="ownerId" value={owner.id} />
                <DeleteButton
                  label={`Revert all ${appliedChanges.length} applied changes`}
                  message="Revert every applied change from this owner to its previous snapshot?"
                  className="btn btn-ghost !px-3 !py-1 text-[11px] text-rose-600"
                />
              </form>
            ) : null}
            <span className="text-[11px] text-muted">{changes.length} records</span>
          </div>
        </div>

        {changes.map((change) => (
          <article key={change.id} className={`card p-4 ${change.deletedAt ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`chip ${changeStatusChip(change)}`}>{change.deletedAt ? "hidden" : change.status}</span>
              <span className="chip bg-slate-100 text-slate-600">{change.kind}</span>
              <span className="text-sm font-bold text-ink">{change.title}</span>
              <span className="text-[11px] text-muted">· {change.aiName}</span>
              {change.sourceUrl ? (
                <a
                  href={change.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[11px] font-semibold text-brand hover:underline"
                >
                  source ↗
                </a>
              ) : null}
              <span className="ml-auto text-[11px] text-muted">
                {new Date(change.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-700">{change.summary}</p>
            {change.note ? <p className="mt-1 text-[11px] text-muted">Note: {change.note}</p> : null}

            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-brand">Before / after snapshot</summary>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <pre className="max-h-56 overflow-auto rounded-xl bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-700">
                  {`before\n${snapshotText(change.before)}`}
                </pre>
                <pre className="max-h-56 overflow-auto rounded-xl bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-700">
                  {`after\n${snapshotText(change.after)}`}
                </pre>
              </div>
            </details>

            <div className="mt-2 flex flex-wrap items-end gap-1.5 border-t border-line/70 pt-2">
              {change.status === "pending" && !change.deletedAt ? (
                <>
                  <form action={decideOwnerChangeAction} className="flex flex-wrap items-end gap-1.5">
                    <input type="hidden" name="changeId" value={change.id} />
                    <input type="hidden" name="ownerId" value={owner.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="btn btn-primary !px-3 !py-1 text-[11px]">Approve &amp; apply</button>
                  </form>
                  <form action={decideOwnerChangeAction} className="flex flex-wrap items-end gap-1.5">
                    <input type="hidden" name="changeId" value={change.id} />
                    <input type="hidden" name="ownerId" value={owner.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input name="note" maxLength={200} placeholder="Reason (shown to the owner)" className="field !w-52 !py-1 text-[11px]" />
                    <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject</button>
                  </form>
                </>
              ) : null}

              {change.status === "applied" && !change.deletedAt ? (
                <form action={revertOwnerChangeAction}>
                  <input type="hidden" name="changeId" value={change.id} />
                  <input type="hidden" name="ownerId" value={owner.id} />
                  <button className="btn btn-ghost !px-3 !py-1 text-[11px] text-rose-600">Revert change</button>
                </form>
              ) : null}

              {change.deletedAt ? (
                <form action={restoreOwnerChangeAction}>
                  <input type="hidden" name="changeId" value={change.id} />
                  <input type="hidden" name="ownerId" value={owner.id} />
                  <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Restore record</button>
                </form>
              ) : (
                <form action={hideOwnerChangeAction}>
                  <input type="hidden" name="changeId" value={change.id} />
                  <input type="hidden" name="ownerId" value={owner.id} />
                  <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Hide record</button>
                </form>
              )}

              <span className="ml-auto self-center text-[10.5px] text-muted">
                {change.status === "applied" ? "Revert restores the exact before-snapshot." : ""}
                {change.reviewedBy ? ` Reviewed by ${change.reviewedBy}.` : ""}
              </span>
            </div>
          </article>
        ))}

        {changes.length === 0 ? <p className="card p-4 text-xs text-muted">No owner edits yet.</p> : null}
      </section>

      {requests.length ? (
        <section className="card p-4">
          <h3 className="text-sm font-bold">Ownership requests</h3>
          <div className="mt-2 divide-y divide-line">
            {requests.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                <span className={`chip ${row.status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {row.status}
                </span>
                <span className="font-medium text-ink">{row.aiName}</span>
                <span className="text-muted">
                  {row.email} · code {row.proofCode}
                  {row.proofFromEmail ? ` · confirmed from ${row.proofFromEmail}` : ""}
                </span>
                <span className="ml-auto text-muted">{new Date(row.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
