import Link from "next/link";
import { verifyOwnerRequestAction, rejectOwnerRequestAction } from "@/app/admin/owners/actions";
import { requireAreaPage } from "@/lib/permissions";
import { aiIdsForOwner, domainsForAi, listOwnerRequests, normalizeUsername, proofCodeExpired } from "@/lib/owners";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  owner: "Owner login created and the listing is now assigned to it.",
  rejected: "Ownership request rejected.",
  deleted: "Owner login deleted. The audit trail was kept.",
};

const ERRORS: Record<string, string> = {
  request: "That request is no longer pending.",
  confirm: "Tick the checkbox to confirm you checked the inbox.",
  domain: "The sender address is not on the listing's official domain.",
  username: "Pick a unique username of at least 3 characters.",
  password: "The password must be at least 8 characters.",
  name: "Display name must be at least 2 characters.",
  owned: "This listing already has an owner login.",
};

function suggestedUsername(company: string, domain: string): string {
  const base = company ? normalizeUsername(company.replace(/\s+/g, "-")) : "";
  if (base.length >= 3) return base;
  const host = domain.split(".")[0] ?? "";
  return normalizeUsername(`${host}-team`) || "owner";
}

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("owners");
  const { saved, error } = await searchParams;
  const db = await refreshDb();

  const pending = listOwnerRequests(db, "pending");
  const reviewed = listOwnerRequests(db).filter((row) => row.status !== "pending").slice(0, 6);
  const owners = (db.ownerAccounts ?? []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const aiById = new Map(db.ai.map((ai) => [ai.id, ai]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">AI owners</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Separate logins for the teams that run an AI listing. Ownership is only granted after a mail from the
            company&apos;s official domain; the vendor claim flow on Submissions stays untouched.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${pending.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pending.length} pending verification
          </span>
          <span className="chip bg-slate-100 text-slate-600">{owners.length} owner logins</span>
          <span className="chip bg-slate-100 text-slate-600">{db.aiOwners?.length ?? 0} listings assigned</span>
        </div>
      </div>

      {saved && SAVED[saved] ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {SAVED[saved]}
        </div>
      ) : null}
      {error && ERRORS[error] ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERRORS[error]}
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Pending verification</h3>
          <span className="text-[11px] text-muted">
            Check the site inbox for the code, then create the login below.
          </span>
        </div>

        {pending.map((request) => {
          const ai = aiById.get(request.aiId);
          const allowed = ai ? domainsForAi(ai) : [request.expectedDomain];
          const expired = proofCodeExpired(request.createdAt);
          return (
            <article key={request.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip bg-brand-soft text-brand">{request.aiName}</span>
                <span className="text-sm font-bold text-ink">{request.applicantName}</span>
                {request.company ? <span className="text-[11px] text-muted">· {request.company}</span> : null}
                <a href={`mailto:${request.email}`} className="text-[11px] font-semibold text-brand hover:underline">
                  {request.email}
                </a>
                <span className="ml-auto text-[11px] text-muted">
                  {new Date(request.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Expected sender: <strong className="text-slate-600">*@{request.expectedDomain}</strong>
                {allowed.length > 1 ? ` · also allowed: ${allowed.filter((d) => d !== request.expectedDomain).join(", ")}` : ""}
                {expired ? <span className="chip ml-2 bg-amber-50 text-amber-700">code older than 14 days</span> : null}
              </p>
              {request.message ? <p className="mt-2 text-sm text-slate-700">{request.message}</p> : null}

              <p className="mt-3 rounded-xl border border-line bg-slate-50 px-3 py-2 text-center font-mono text-base font-bold tracking-[0.18em] text-slate-700">
                {request.proofCode}
              </p>

              <form action={verifyOwnerRequestAction} className="mt-3 grid gap-2 border-t border-line/70 pt-3 sm:grid-cols-3">
                <input type="hidden" name="requestId" value={request.id} />
                <label className="block text-[11px] font-semibold text-slate-600">
                  Sender seen in the inbox
                  <input
                    name="proofFromEmail"
                    type="email"
                    required
                    defaultValue={request.email}
                    className="field mt-1 w-full"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Display name
                  <input
                    name="displayName"
                    required
                    defaultValue={request.company || request.applicantName}
                    maxLength={60}
                    className="field mt-1 w-full"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Username
                  <input
                    name="username"
                    required
                    defaultValue={suggestedUsername(request.company, request.expectedDomain)}
                    maxLength={32}
                    className="field mt-1 w-full"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Temporary password (8+)
                  <input name="password" type="password" required minLength={8} className="field mt-1 w-full" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Editing mode
                  <select name="tier" defaultValue="review" className="field mt-1 w-full">
                    <option value="review">Review — changes need approval (recommended)</option>
                    <option value="live">Live — changes apply at once</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end text-[11px] font-medium text-slate-700">
                  <input type="checkbox" name="confirmed" className="h-3.5 w-3.5 accent-emerald-600" />
                  I checked this code arrived from the official domain
                </label>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                  <button className="btn btn-primary !px-3 !py-1 text-[11px]">Create owner login</button>
                  <span className="text-[10.5px] text-muted">
                    The owner must set a new password on first sign in.
                  </span>
                </div>
              </form>

              <form action={rejectOwnerRequestAction} className="mt-2 flex flex-wrap items-end gap-1.5 border-t border-line/70 pt-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input name="note" maxLength={200} placeholder="Reason (internal)" className="field !w-64 !py-1 text-[11px]" />
                <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject request</button>
              </form>
            </article>
          );
        })}

        {pending.length === 0 ? (
          <p className="card p-4 text-xs text-muted">
            No ownership requests waiting. Companies apply from{" "}
            <Link href="/owner/claim" className="font-semibold text-brand">
              /owner/claim
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold">Owner logins</h3>
        <div className="card overflow-x-auto">
          <table className="w-full break-words text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3">Owner</th>
                <th className="p-3">Email</th>
                <th className="p-3">Listings</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last sign in</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {owners.map((owner) => {
                const aiIds = aiIdsForOwner(db, owner.id);
                return (
                  <tr key={owner.id} className={owner.status === "banned" ? "bg-rose-50/30" : "hover:bg-slate-50/60"}>
                    <td className="p-3">
                      <span className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                          {owner.initials}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/admin/owners/${owner.id}`} className="block truncate font-medium hover:text-brand">
                            {owner.displayName}
                          </Link>
                          <span className="block text-[10px] text-muted">@{owner.username}</span>
                        </span>
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted">{owner.email}</td>
                    <td className="p-3 text-xs">
                      {aiIds.length
                        ? aiIds.map((id) => aiById.get(id)?.name ?? id).join(", ")
                        : <span className="text-amber-700">none</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`chip ${
                          owner.tier === "review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {owner.tier}
                      </span>
                    </td>
                    <td className="p-3">
                      {owner.status === "banned" ? (
                        <span className="chip bg-rose-50 text-rose-600">Banned</span>
                      ) : (
                        <span className="chip bg-emerald-50 text-emerald-700">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-muted">
                      {owner.lastLoginAt ? new Date(owner.lastLoginAt).toLocaleString("en-IN") : "never"}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/owners/${owner.id}`} className="btn btn-primary !px-2 !py-1 text-xs">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {owners.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted">No owner logins yet.</p>
          ) : null}
        </div>
      </section>

      {reviewed.length ? (
        <section className="card divide-y divide-line">
          {reviewed.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
              <span
                className={`chip ${
                  row.status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {row.status}
              </span>
              <span className="font-medium text-ink">{row.aiName}</span>
              <span className="text-muted">
                {row.email}
                {row.proofFromEmail ? ` · proof from ${row.proofFromEmail}` : ""}
              </span>
              <span className="ml-auto text-muted">{new Date(row.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
