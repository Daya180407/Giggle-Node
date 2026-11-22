import Link from "next/link";
import {
  deleteSubscriberAction,
  reviewClaimAction,
  reviewContributionAction,
  reviewToolSubmissionAction,
} from "@/app/actions";
import { CONTRIBUTION_LABEL, contributionCounts, pendingContributions, reviewedContributions } from "@/lib/contributions";
import type { Contribution } from "@/lib/types";
import { requireAreaPage } from "@/lib/permissions";
import { priceHistoryFor, priceChange, subscriberStats } from "@/lib/community";
import { categoryName } from "@/lib/categories";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const SAVED_LABEL: Record<string, string> = {
  approved: "Submission approved — the tool is now in the catalogue.",
  rejected: "Submission rejected.",
  claimed: "Claim approved. The vendor can now reply to reviews.",
  "claim-rejected": "Claim rejected.",
  "subscriber-removed": "Subscriber removed.",
  "contribution-approved": "Request approved — it is live on the public site now.",
  "contribution-rejected": "Request rejected. The submitter can see your note.",
};

/** One-line summary of what a request would add, so no research is needed. */
function requestDetail(row: Contribution) {
  if (row.type === "plan") {
    return `$${row.priceMonthly ?? 0}/month${row.priceYearly ? ` · $${row.priceYearly}/year` : ""}`;
  }
  if (row.type === "pricing") return `New starting price: $${row.priceMonthly ?? 0}/month`;
  if (row.type === "model") return `${row.priceType ?? "freemium"} model`;
  if (row.type === "app") {
    return `${row.appKind === "desktop" ? "PC software" : "Mobile app"} · ${row.group ?? "utility"}`;
  }
  return "";
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { saved } = await searchParams;
  const db = await refreshDb();
  const submissions = db.toolSubmissions ?? [];
  const pendingSubmissions = submissions.filter((row) => row.status === "pending");
  const reviewedSubmissions = submissions.filter((row) => row.status !== "pending").slice(0, 8);

  const requests = pendingContributions(db);
  const reviewedRequests = reviewedContributions(db);
  const requestStats = contributionCounts(db);

  const claims = db.claimRequests ?? [];
  const pendingClaims = claims.filter((row) => row.status === "pending");
  const claimedTools = db.ai.filter((ai) => ai.claim);

  const alerts = db.priceAlerts ?? [];
  const users = new Map(db.users.map((user) => [user.id, user]));
  const subscribers = db.subscribers ?? [];
  const stats = subscriberStats(db);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Submissions &amp; claims</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Tool suggestions, vendor claims, price alerts and newsletter subscribers — everything users send you lands
            here.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${requestStats.pending ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {requestStats.pending} catalogue requests
          </span>
          <span className={`chip ${pendingSubmissions.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pendingSubmissions.length} tool suggestions
          </span>
          <span className={`chip ${pendingClaims.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pendingClaims.length} claims
          </span>
          <span className="chip bg-slate-100 text-slate-600">{alerts.length} price alerts</span>
          <span className="chip bg-slate-100 text-slate-600">{stats.confirmed} subscribers</span>
        </div>
      </div>

      {saved && SAVED_LABEL[saved] ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {SAVED_LABEL[saved]}
        </div>
      ) : null}

      {/* Catalogue requests: plans, models, pricing, new AI and new apps */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Catalogue requests</h3>
          <span className="text-[11px] text-muted">
            {requestStats.approved} approved · {requestStats.rejected} rejected
          </span>
        </div>

        {requests.map((row) => (
          <article key={row.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand">{CONTRIBUTION_LABEL[row.type]}</span>
              <span className="text-sm font-bold text-ink">{row.title}</span>
              {row.aiName ? <span className="chip bg-slate-100 text-slate-600">for {row.aiName}</span> : null}
              <span className="ml-auto text-[11px] text-muted">
                {new Date(row.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-700">{requestDetail(row)}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{row.note}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
              <span>
                From <strong className="text-slate-600">{row.userName}</strong>
              </span>
              <a href={`mailto:${row.userEmail}`} className="text-brand hover:underline">
                {row.userEmail}
              </a>
              {row.sourceUrl ? (
                <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">
                  Source ↗
                </a>
              ) : null}
              {row.website ? (
                <a href={row.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">
                  Website ↗
                </a>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-1.5 border-t border-line/70 pt-2">
              <form action={reviewContributionAction} className="flex flex-wrap items-end gap-1.5">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="approve" />
                <input type="hidden" name="back" value="/admin/submissions" />
                <button className="btn btn-primary !px-3 !py-1 text-[11px]">Approve &amp; publish</button>
              </form>
              <form action={reviewContributionAction} className="flex flex-wrap items-end gap-1.5">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="reject" />
                <input type="hidden" name="back" value="/admin/submissions" />
                <input
                  name="reviewNote"
                  maxLength={300}
                  placeholder="Reason (shown to the user)"
                  className="field !w-56 !py-1 text-[11px]"
                  aria-label="Rejection reason"
                />
                <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject</button>
              </form>
              <span className="ml-auto self-center text-[10.5px] text-muted">
                {row.type === "app" ? "Approving adds it to the Home apps showcase." : "Approving writes it into the live listing."}
              </span>
            </div>
          </article>
        ))}

        {reviewedRequests.length ? (
          <div className="card divide-y divide-line">
            {reviewedRequests.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                <span
                  className={`chip ${
                    row.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {row.status}
                </span>
                <span className="font-medium text-ink">{CONTRIBUTION_LABEL[row.type]}</span>
                <span className="text-muted">
                  {row.title}
                  {row.aiName ? ` · ${row.aiName}` : ""}
                </span>
                <span className="ml-auto text-muted">{row.userEmail}</span>
              </div>
            ))}
          </div>
        ) : null}

        {requests.length === 0 && reviewedRequests.length === 0 ? (
          <p className="card p-4 text-xs text-muted">
            No catalogue requests yet. Signed-in users can add plans, models, pricing and apps from an AI page or /submit.
          </p>
        ) : null}
      </section>

      {/* Tool suggestions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Tool suggestions</h3>
          <Link href="/submit" className="text-[11px] font-semibold text-brand">
            Public form →
          </Link>
        </div>

        {pendingSubmissions.map((row) => (
          <article key={row.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand">{categoryName(row.category)}</span>
              <span className="chip bg-slate-100 capitalize text-slate-600">{row.priceType}</span>
              <span className="text-sm font-bold text-ink">{row.name}</span>
              <a
                href={row.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                {row.website.replace(/^https?:\/\//, "")} ↗
              </a>
              <span className="ml-auto text-[11px] text-muted">
                {new Date(row.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{row.description}</p>
            <p className="mt-1 text-[11px] text-muted">
              From <strong className="text-slate-600">{row.submitterName}</strong> ·{" "}
              <a href={`mailto:${row.submitterEmail}`} className="text-brand hover:underline">
                {row.submitterEmail}
              </a>{" "}
              · starting price ${row.planPrice}/mo
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
              <form action={reviewToolSubmissionAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className="btn btn-primary !px-3 !py-1 text-[11px]">Approve &amp; publish</button>
              </form>
              <form action={reviewToolSubmissionAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="reject" />
                <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject</button>
              </form>
              <span className="ml-auto self-center text-[10.5px] text-muted">
                Approving creates the AI, one model and a baseline price snapshot.
              </span>
            </div>
          </article>
        ))}

        {reviewedSubmissions.length ? (
          <div className="card divide-y divide-line">
            {reviewedSubmissions.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                <span
                  className={`chip ${
                    row.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {row.status}
                </span>
                <span className="font-medium text-ink">{row.name}</span>
                <span className="text-muted">{row.submitterEmail}</span>
                {row.aiId ? (
                  <Link
                    href={`/ai/${db.ai.find((ai) => ai.id === row.aiId)?.slug ?? ""}`}
                    className="ml-auto text-[11px] font-semibold text-brand"
                  >
                    Open listing →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {pendingSubmissions.length === 0 && reviewedSubmissions.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-2xl" aria-hidden>
              ✦
            </p>
            <p className="mt-1 text-sm text-slate-600">No suggestions yet.</p>
            <p className="mt-1 text-xs text-muted">Share /submit so readers can send tools in.</p>
          </div>
        ) : null}
      </section>

      {/* Claims */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Vendor claims</h3>
        {pendingClaims.map((row) => (
          <article key={row.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip bg-brand-soft text-brand">{row.aiName}</span>
              <span className="text-sm font-bold text-ink">{row.vendorName}</span>
              <a href={`mailto:${row.email}`} className="text-[11px] font-semibold text-brand hover:underline">
                {row.email}
              </a>
              <span className="ml-auto text-[11px] text-muted">{new Date(row.createdAt).toLocaleString("en-IN")}</span>
            </div>
            {row.message ? <p className="mt-2 text-sm text-slate-700">{row.message}</p> : null}
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
              <form action={reviewClaimAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className="btn btn-primary !px-3 !py-1 text-[11px]">Approve claim</button>
              </form>
              <form action={reviewClaimAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="reject" />
                <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject</button>
              </form>
            </div>
          </article>
        ))}

        {claimedTools.length ? (
          <div className="card divide-y divide-line">
            {claimedTools.map((ai) => (
              <div key={ai.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                <span className="chip bg-emerald-50 text-emerald-700">claimed</span>
                <Link href={`/ai/${ai.slug}`} className="font-medium text-ink hover:text-brand">
                  {ai.name}
                </Link>
                <span className="text-muted">
                  {ai.claim?.vendorName} · {ai.claim?.email}
                </span>
                <span className="ml-auto text-muted">{ai.claim ? new Date(ai.claim.at).toLocaleDateString("en-IN") : ""}</span>
              </div>
            ))}
          </div>
        ) : null}

        {pendingClaims.length === 0 && claimedTools.length === 0 ? (
          <p className="card p-4 text-xs text-muted">
            No claims yet. Vendors can request a claim from the bottom of any AI page.
          </p>
        ) : null}
      </section>

      {/* Price alerts */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Price alerts</h3>
        <div className="card overflow-hidden">
          {alerts.length ? (
            <div className="divide-y divide-line">
              {alerts.slice(0, 20).map((alert) => {
                const ai = db.ai.find((row) => row.id === alert.aiId);
                const user = users.get(alert.userId);
                const history = ai ? priceHistoryFor(db, ai.id) : [];
                const change = ai ? priceChange(db, ai.id) : null;
                return (
                  <div key={alert.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                    <span className="font-medium text-ink">{ai?.name ?? "Removed tool"}</span>
                    <span className="text-muted">{user?.email ?? alert.userId}</span>
                    {change ? (
                      <span
                        className={`chip ${
                          change.percent < 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {change.percent > 0 ? "+" : ""}
                        {change.percent}% price change
                      </span>
                    ) : null}
                    <span className="ml-auto text-muted">
                      {history.length} snapshot{history.length === 1 ? "" : "s"} · since{" "}
                      {new Date(alert.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-4 text-xs text-muted">
              No price alerts yet. Signed-in users can watch a tool from its pricing section.
            </p>
          )}
        </div>
        <p className="px-1 text-[10.5px] leading-relaxed text-muted">
          Saving a new starting price in the AI editor records a snapshot and notifies every watcher — in-app, plus email
          when email delivery is enabled.
        </p>
      </section>

      {/* Newsletter */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Newsletter subscribers</h3>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="chip bg-emerald-50 text-emerald-700">{stats.confirmed} confirmed</span>
            <span className="chip bg-amber-50 text-amber-700">{stats.pending} pending</span>
            <span className="chip bg-slate-100 text-slate-500">{stats.unsubscribed} unsubscribed</span>
          </div>
        </div>
        <div className="card overflow-hidden">
          {subscribers.length ? (
            <div className="divide-y divide-line">
              {subscribers.slice(0, 25).map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                  <span
                    className={`chip ${
                      row.unsubscribedAt
                        ? "bg-slate-100 text-slate-500"
                        : row.confirmed
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {row.unsubscribedAt ? "unsubscribed" : row.confirmed ? "confirmed" : "pending"}
                  </span>
                  <span className="font-medium text-ink">{row.email}</span>
                  <span className="text-muted">{row.source}</span>
                  <span className="ml-auto text-muted">{new Date(row.createdAt).toLocaleDateString("en-IN")}</span>
                  <form action={deleteSubscriberAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-[11px] font-semibold text-rose-600 hover:underline">Remove</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-xs text-muted">No subscribers yet. The capture form sits in the site footer.</p>
          )}
        </div>
        <p className="px-1 text-[10.5px] leading-relaxed text-muted">
          The weekly Top 5 send from Notifications &amp; Email includes confirmed subscribers as well as accounts.
        </p>
      </section>
    </div>
  );
}
