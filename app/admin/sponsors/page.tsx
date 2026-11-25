import Link from "next/link";
import {
  deleteSponsorPlacementAction,
  reviewSponsorRequestAction,
  saveSponsorPricesAction,
  saveSponsorshipAction,
  setBoostAction,
  setSponsoredAction,
  toggleSponsorPlacementAction,
} from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import SponsorPlacementForm from "@/components/admin/SponsorPlacementForm";
import { AiLogo, Stars } from "@/components/ui";
import { categoryName, getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { buildView, rankedAis } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { allApps } from "@/lib/software";
import {
  isPlacementLive,
  money,
  placementListLabel,
  slotMeta,
  SPONSOR_SLOTS,
  sponsorPrices,
  sponsorRevenue,
  sponsorEnded,
} from "@/lib/sponsors";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  rates: "Slot prices saved. The public sponsor form now quotes these prices.",
  placement: "Sponsored placement saved.",
  request: "Sponsorship request updated.",
};

const ERRORS: Record<string, string> = {
  target: "Pick the AI, app or software you want to promote.",
  list: "That list does not match the chosen listing type. Pick an AI list for an AI, or an app list for an app.",
  slot: "Pick a valid position.",
};

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; error?: string }>;
}) {
  await requireAreaPage("sponsors");
  const { q = "", saved, error } = await searchParams;
  const db = readDb();
  const view = buildView(db);
  const ranked = rankedAis(view);
  const query = q.trim().toLowerCase();
  const matched = ranked.filter((s) =>
    query ? [s.ai.name, s.ai.slug, s.ai.category].join(" ").toLowerCase().includes(query) : true,
  );
  const sponsored = matched.filter((s) => s.ai.sponsored);
  const others = matched.filter((s) => !s.ai.sponsored).slice(0, 80);

  const categories = getCategories(db);
  const catName = (slug: string) => categories.find((category) => category.slug === slug)?.name ?? categoryName(slug);
  const settings = getSiteSettings(db);
  const currency = settings.appearance.currency;
  const prices = sponsorPrices(db);
  const apps = allApps(db.customApps);
  const placements = [...(db.sponsorPlacements ?? [])].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  const requests = [...(db.sponsorRequests ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const liveCount = placements.filter((placement) => isPlacementLive(placement)).length;
  const revenue = sponsorRevenue(db);
  const aisForForm = ranked
    .map((s) => ({ id: s.ai.id, name: s.ai.name, categoryName: catName(s.ai.category) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Sponsors &amp; paid placements</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            A paid placement inserts a labelled row into one list without touching the ranking. Set slot prices here,
            add a booking directly, or approve a request sent through <Link href="/sponsor" className="font-semibold text-brand">/sponsor</Link>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-emerald-50 text-emerald-700">{liveCount} live</span>
          <span className={`chip ${pendingRequests.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pendingRequests.length} requests
          </span>
        </div>
      </div>

      {saved && SAVED[saved] ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {SAVED[saved]}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERRORS[error] ?? "That placement could not be saved."}
        </div>
      ) : null}

      {/* Revenue summary */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Revenue</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Manual payments only — booked amounts are the amounts you entered on each placement. Pending quotes are
              requests where the money has not arrived yet.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">{revenue.monthLabel}</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">This month</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{money(revenue.monthTotal, currency)}</p>
            <p className="text-[10.5px] text-emerald-800">
              {revenue.monthCount} placement{revenue.monthCount === 1 ? "" : "s"} booked
            </p>
          </div>
          <div className="rounded-xl border border-line bg-slate-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">All-time booked</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{money(revenue.bookedTotal, currency)}</p>
            <p className="text-[10.5px] text-muted">
              {revenue.bookedCount} placement{revenue.bookedCount === 1 ? "" : "s"} · {liveCount} live now
            </p>
          </div>
          <div className={`rounded-xl border p-3 ${revenue.pendingTotal ? "border-amber-200 bg-amber-50/60" : "border-line bg-slate-50/70"}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Pending requests</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{money(revenue.pendingTotal, currency)}</p>
            <p className="text-[10.5px] text-amber-800">
              {revenue.pendingCount} request{revenue.pendingCount === 1 ? "" : "s"} waiting
            </p>
          </div>
        </div>

        <div className="admin-table-scroll mt-3">
          <table className="admin-table w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="p-2">Slot</th>
                <th className="p-2 text-right">Placements</th>
                <th className="p-2 text-right">Booked</th>
                <th className="p-2 text-right">This month</th>
                <th className="p-2 text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {revenue.rows.map((row) => (
                <tr key={row.slot} className="hover:bg-slate-50/60">
                  <td className="p-2 font-medium text-ink">{row.label}</td>
                  <td className="p-2 text-right text-muted">{row.count}</td>
                  <td className="p-2 text-right font-semibold text-ink">{money(row.booked, currency)}</td>
                  <td className="p-2 text-right text-slate-600">{money(row.month, currency)}</td>
                  <td className="p-2 text-right text-amber-700">
                    {row.pending ? `${money(row.pending, currency)} · ${row.pendingCount}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50/70 text-xs font-bold text-ink">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{revenue.bookedCount}</td>
                <td className="p-2 text-right">{money(revenue.bookedTotal, currency)}</td>
                <td className="p-2 text-right">{money(revenue.monthTotal, currency)}</td>
                <td className="p-2 text-right text-amber-700">{money(revenue.pendingTotal, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Advertiser requests */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Sponsorship requests</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Sent from the public sponsor form with the quoted price. Approving goes live for 30 days — confirm the
              manual payment first.
            </p>
          </div>
          <span className={`chip ${pendingRequests.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pendingRequests.length} pending
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {pendingRequests.map((request) => {
            const slot = slotMeta(request.slot);
            return (
              <div key={request.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {request.company}{" "}
                      <span className="font-normal text-muted">· {request.contactName}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      <a href={`mailto:${request.email}`} className="font-semibold text-brand hover:underline">
                        {request.email}
                      </a>
                      {request.website ? (
                        <>
                          {" · "}
                          <a
                            href={request.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand hover:underline"
                          >
                            website ↗
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-ink">{money(request.price, currency)}</p>
                    <p className="text-[10px] text-muted">quoted · 30 days</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="chip bg-white text-slate-600">
                    {request.targetType === "ai" ? "AI" : "App"}: {request.targetName}
                  </span>
                  <span className="chip bg-white text-slate-600">{placementListLabel(request, catName)}</span>
                  <span className="chip bg-white text-slate-600">{slot?.short ?? request.slot}</span>
                  <span className="chip bg-white text-slate-400">{request.createdAt.slice(0, 10)}</span>
                </div>

                {request.message ? (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-white/80 px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-600">
                    {request.message}
                  </p>
                ) : null}

                <form action={reviewSponsorRequestAction} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={request.id} />
                  <div className="min-w-[200px] flex-1">
                    <label className="label !text-[10px]" htmlFor={`note_${request.id}`}>
                      Admin note
                    </label>
                    <input
                      id={`note_${request.id}`}
                      name="note"
                      className="field !py-1 text-xs"
                      placeholder="Payment received, invoice no…"
                    />
                  </div>
                  <button name="decision" value="approve" className="btn btn-primary !py-1.5 text-xs">
                    Approve &amp; go live
                  </button>
                  <button name="decision" value="reject" className="btn btn-ghost !py-1.5 text-xs text-rose-600">
                    Reject
                  </button>
                </form>
              </div>
            );
          })}
          {pendingRequests.length === 0 ? (
            <p className="py-2 text-sm text-muted">No pending requests. New ones appear here automatically.</p>
          ) : null}
        </div>

        {requests.length > pendingRequests.length ? (
          <details className="mt-3 border-t border-line pt-2">
            <summary className="cursor-pointer text-[11px] font-semibold text-brand">
              Handled requests ({requests.length - pendingRequests.length})
            </summary>
            <div className="mt-1 divide-y divide-line">
              {requests
                .filter((request) => request.status !== "pending")
                .slice(0, 30)
                .map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                    <span className="font-medium text-ink">
                      {request.company} · {request.targetName}
                    </span>
                    <span className="text-muted">
                      {slotMeta(request.slot)?.short ?? request.slot} · {money(request.price, currency)}
                    </span>
                    <span
                      className={`chip ${
                        request.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {request.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {request.reviewedBy ?? "—"} · {(request.reviewedAt ?? request.createdAt).slice(0, 10)}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        ) : null}
      </section>

      {/* Placements */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Placements ({placements.length})</h3>
            <p className="mt-0.5 text-[11px] text-muted">
              Paused or expired rows stay saved but disappear from the site immediately.
            </p>
          </div>
        </div>
        <div className="mt-2 divide-y divide-line">
          {placements.map((placement) => {
            const slot = slotMeta(placement.slot);
            const live = isPlacementLive(placement);
            const targetAi = placement.targetType === "ai" ? db.ai.find((ai) => ai.id === placement.targetId) : undefined;
            const targetApp =
              placement.targetType === "app" ? apps.find((app) => app.slug === placement.targetId) : undefined;
            return (
              <div key={placement.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <AiLogo
                  logo={targetAi?.logo ?? targetApp?.emoji ?? "🤖"}
                  color={targetAi?.color ?? targetApp?.color ?? "#4F46E5"}
                  size={32}
                  rounded="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">{placement.targetName}</span>
                    {live ? (
                      <span className="chip bg-emerald-50 text-emerald-700">Live</span>
                    ) : placement.active ? (
                      <span className="chip bg-amber-50 text-amber-700">Expired</span>
                    ) : (
                      <span className="chip bg-slate-100 text-slate-500">Paused</span>
                    )}
                    {placement.targetType === "ai" ? (
                      <span className="chip bg-slate-100 text-slate-600">AI</span>
                    ) : (
                      <span className="chip bg-slate-100 text-slate-600">App</span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted">
                    {placementListLabel(placement, catName)} · {slot?.short ?? placement.slot} ·{" "}
                    {money(placement.amount, currency)}
                    {placement.until ? ` · till ${placement.until}` : " · open-ended"}
                    {placement.note ? ` · ${placement.note}` : ""}
                  </p>
                </div>
                <form action={toggleSponsorPlacementAction}>
                  <input type="hidden" name="id" value={placement.id} />
                  <button className="btn btn-ghost !px-2 !py-1 text-xs">
                    {placement.active ? "Pause" : "Resume"}
                  </button>
                </form>
                <form action={deleteSponsorPlacementAction}>
                  <input type="hidden" name="id" value={placement.id} />
                  <DeleteButton
                    label="Delete"
                    message={`Remove the sponsored placement for ${placement.targetName}?`}
                  />
                </form>
              </div>
            );
          })}
          {placements.length === 0 ? (
            <p className="py-3 text-sm text-muted">No sponsored placements yet.</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Add placement */}
        <section className="card p-4">
          <h3 className="text-sm font-bold">Add a sponsored placement</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Added directly, without waiting for a request. It appears on the matching list only, keeps its real rank and
            carries a Sponsored tag.
          </p>
          <div className="mt-3">
            <SponsorPlacementForm
              ais={aisForForm}
              apps={apps.map((app) => ({ slug: app.slug, name: app.name, kind: app.kind }))}
              categories={categories.map((category) => ({ slug: category.slug, name: category.name }))}
              prices={prices}
              currency={currency}
            />
          </div>
        </section>

        {/* Slot prices */}
        <section className="card p-4">
          <h3 className="text-sm font-bold">Slot prices</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            What each position costs for 30 days. The public form shows this quote before submitting, and the admin
            quote uses the same numbers.
          </p>
          <form action={saveSponsorPricesAction} className="mt-3 space-y-2">
            {SPONSOR_SLOTS.map((slot) => (
              <div key={slot.key} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-ink">{slot.short}</p>
                  <p className="truncate text-[10px] text-muted">{slot.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">{currency === "USD" ? "$" : "₹"}</span>
                  <input
                    name={`price_${slot.key}`}
                    type="number"
                    min={0}
                    defaultValue={prices[slot.key]}
                    className="field !w-24 !py-1 text-xs"
                    aria-label={`${slot.short} price`}
                  />
                </div>
              </div>
            ))}
            <button className="btn btn-primary !py-2 text-xs">Save slot prices</button>
          </form>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
            Money is collected manually — UPI or bank transfer — after the team confirms availability. Nothing is
            charged automatically.
          </p>
        </section>
      </div>

      {/* Legacy per-listing labels */}
      <section className="card p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Listing labels, affiliate links &amp; manual boost</h3>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-muted">
              The older per-AI controls. The “Sponsored” flag adds a label on the AI page; the boost only nudges its
              position in the weighted ranking. The placement system above is what shows a labelled row inside a list.
            </p>
          </div>
          <span className="chip bg-amber-50 text-amber-700">{db.ai.filter((ai) => ai.sponsored).length} labelled</span>
        </div>

        <form className="mt-3 flex flex-wrap items-center gap-2" action="/admin/sponsors">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search AI by name, slug or category…"
            className="field min-w-[200px] flex-1 !py-2 text-xs"
            aria-label="Search sponsors"
          />
          <button className="btn btn-primary !py-2 text-xs">Search</button>
          {q ? (
            <Link href="/admin/sponsors" className="btn btn-ghost !py-2 text-xs">
              Reset
            </Link>
          ) : null}
          <span className="ml-auto text-[11px] text-muted">{matched.length} matches</span>
        </form>

        {sponsored.length ? (
          <div className="mt-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Labelled ({sponsored.length})</h4>
            <div className="mt-1 divide-y divide-line">
              {sponsored.map((stat) => (
                <SponsorRow key={stat.ai.id} stat={stat} sponsored />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Other AI</h4>
            <span className="text-[11px] text-muted">
              Showing {others.length} of {matched.length - sponsored.length}
            </span>
          </div>
          <div className="mt-1 divide-y divide-line">
            {others.map((stat) => (
              <SponsorRow key={stat.ai.id} stat={stat} sponsored={false} />
            ))}
          </div>
          {others.length === 0 ? <p className="py-4 text-sm text-muted">No tools match this search.</p> : null}
        </div>
      </section>
    </div>
  );
}

function SponsorRow({
  stat,
  sponsored,
}: {
  stat: ReturnType<typeof rankedAis>[number];
  sponsored: boolean;
}) {
  const { ai } = stat;
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5">
      <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={34} rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/ai/${ai.slug}`} className="truncate text-sm font-medium hover:text-brand">
          {ai.name}
        </Link>
        {ai.sponsored && sponsorEnded(ai.sponsorUntil) ? (
          <span className="chip bg-amber-50 text-[9.5px] text-amber-700" title={`Booked till ${ai.sponsorUntil}`}>
            Expired
          </span>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Stars value={stat.score} size={11} />
          <span className="text-xs text-muted">
            score {stat.score.toFixed(2)} · {stat.votes} votes
          </span>
        </div>
      </div>
      <form action={setBoostAction} className="flex items-center gap-1">
        <input type="hidden" name="id" value={ai.id} />
        <input
          name="boost"
          type="number"
          step="0.01"
          min={0}
          max={1}
          defaultValue={ai.boost}
          className="field !w-20 !py-1 text-xs"
          aria-label={`Boost for ${ai.name}`}
        />
        <button className="btn btn-ghost !px-2 !py-1 text-xs">Set boost</button>
      </form>
      <form action={setSponsoredAction}>
        <input type="hidden" name="id" value={ai.id} />
        <button
          className={`btn !px-2 !py-1 text-xs ${
            sponsored ? "border border-amber-200 bg-amber-50 text-amber-700" : "btn-ghost"
          }`}
        >
          {sponsored ? "Sponsored ✓" : "Mark sponsored"}
        </button>
      </form>

      <details className="w-full">
        <summary className="cursor-pointer text-[11px] font-semibold text-brand">
          Deal details
          {ai.sponsorAmount ? ` · ₹${ai.sponsorAmount}` : ""}
          {ai.sponsorUntil ? ` · till ${ai.sponsorUntil}` : ""}
          {ai.affiliateUrl ? " · affiliate" : ""}
        </summary>
        <form
          action={saveSponsorshipAction}
          className="mt-2 flex flex-wrap items-end gap-1.5 rounded-xl border border-line bg-slate-50/70 p-2"
        >
          <input type="hidden" name="id" value={ai.id} />
          <div>
            <label className="label !text-[10px]" htmlFor={`amount_${ai.id}`}>
              Amount paid (₹)
            </label>
            <input
              id={`amount_${ai.id}`}
              name="sponsorAmount"
              type="number"
              min={0}
              defaultValue={ai.sponsorAmount ?? ""}
              className="field !w-28 !py-1 text-xs"
            />
          </div>
          <div>
            <label className="label !text-[10px]" htmlFor={`days_${ai.id}`}>
              Days booked
            </label>
            <input
              id={`days_${ai.id}`}
              name="sponsorDays"
              type="number"
              min={0}
              className="field !w-24 !py-1 text-xs"
              placeholder="30"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="label !text-[10px]" htmlFor={`aff_${ai.id}`}>
              Affiliate URL
            </label>
            <input
              id={`aff_${ai.id}`}
              name="affiliateUrl"
              defaultValue={ai.affiliateUrl ?? ""}
              className="field !py-1 text-xs"
              placeholder="https://partner.example.com/ref=gigglenode"
            />
          </div>
          <label className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-600">
            <input type="checkbox" name="sponsored" defaultChecked={ai.sponsored} className="h-3.5 w-3.5 accent-indigo-600" />
            Sponsored label
          </label>
          <label className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-600">
            <input type="checkbox" name="clearEnd" className="h-3.5 w-3.5 accent-rose-600" />
            Clear end date
          </label>
          <button className="btn btn-primary !py-1 text-xs">Save deal</button>
        </form>
      </details>
    </div>
  );
}
