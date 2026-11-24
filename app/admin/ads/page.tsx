import Link from "next/link";
import {
  deleteChatAdAction,
  saveChatAdCpmAction,
  toggleChatAdAction,
} from "@/app/actions";
import ChatAdForm from "@/components/admin/ChatAdForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { AiLogo } from "@/components/ui";
import {
  chatAdBookedValue,
  chatAdCpm,
  chatAdCreative,
  chatAdDeliveredValue,
  chatAdProgress,
  chatAdReportPath,
  chatAdStatus,
  chatAdViewsLeft,
  chatAdsSummary,
  placementInsights,
} from "@/lib/ads";
import { categoryName, getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { buildView, rankedAis } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { allApps } from "@/lib/software";
import { money, placementListLabel } from "@/lib/sponsors";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  name: "Give the campaign a name of at least 2 characters.",
  email: "Enter a valid advertiser email for the report link.",
  headline: "Write a headline of at least 4 characters.",
  body: "Write a short description of at least 4 characters.",
  views: "Views bought must be between 100 and 5,000,000.",
  cpm: "Enter a CPM between 0 and 100,000.",
  url: "The destination URL must start with http:// or https://.",
  target: "Pick the AI, app or software you want to promote.",
};

const STATUS_STYLE: Record<string, string> = {
  Running: "bg-emerald-50 text-emerald-700",
  Paused: "bg-slate-100 text-slate-500",
  Finished: "bg-indigo-50 text-indigo-700",
  Expired: "bg-amber-50 text-amber-700",
};

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("sponsors");
  const { saved, error } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const currency = settings.appearance.currency;
  const symbol = currency === "USD" ? "$" : "₹";
  const cpm = chatAdCpm(db);
  const summary = chatAdsSummary(db);
  const ads = [...(db.chatAds ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const savedAd = saved && saved !== "cpm" && saved !== "campaign" ? ads.find((ad) => ad.id === saved) : undefined;

  const categories = getCategories(db);
  const catName = (slug: string) => categories.find((row) => row.slug === slug)?.name ?? categoryName(slug);
  const view = buildView(db);
  const aisForForm = rankedAis(view)
    .map((s) => ({ id: s.ai.id, name: s.ai.name, categoryName: catName(s.ai.category) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const appsForForm = allApps(db.customApps).map((app) => ({ slug: app.slug, name: app.name, kind: app.kind }));
  const placements = placementInsights(db, (placement) => placementListLabel(placement, catName));
  const placementTotals = placements.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      clicks: sum.clicks + row.clicks,
    }),
    { views: 0, clicks: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Chat ads &amp; insights</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Sponsored cards inside the community chat, sold by views: buy 10,000 views at a CPM and the card stops
            automatically once they have been delivered. Every campaign has its own advertiser report with views,
            clicks and CTR. Day-priced list placements get the same insights below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-emerald-50 text-emerald-700">{summary.live} live campaigns</span>
          <Link href="/admin/sponsors" className="btn btn-ghost text-xs">
            List placements
          </Link>
          <Link href="/community" className="btn btn-ghost text-xs">
            Open chat ↗
          </Link>
        </div>
      </div>

      {savedAd ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Campaign created. Share this advertiser report link:{" "}
          <Link href={chatAdReportPath(savedAd.reportToken)} className="font-semibold underline">
            {chatAdReportPath(savedAd.reportToken)}
          </Link>
        </div>
      ) : saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "cpm" ? "Default chat CPM saved." : "Campaign updated."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERRORS[error] ?? "That campaign could not be saved."}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Live campaigns", value: summary.live.toLocaleString("en-IN") },
          { label: "Views delivered", value: summary.viewsServed.toLocaleString("en-IN") },
          { label: "Views bought", value: summary.viewsPurchased.toLocaleString("en-IN") },
          { label: "Clicks", value: summary.clicks.toLocaleString("en-IN") },
          { label: "CTR", value: `${summary.ctr.toFixed(2)}%` },
          { label: "Booked value", value: money(summary.bookedValue, currency) },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-lg font-extrabold">{card.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card p-4">
          <h3 className="text-sm font-bold">New chat campaign</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            Payment is collected manually. The view budget is enforced by the site, not by an honour system.
          </p>
          <div className="mt-3">
            <ChatAdForm ais={aisForForm} apps={appsForForm} defaultCpm={cpm} currencySymbol={symbol} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h3 className="text-sm font-bold">Default CPM</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Price per 1000 views. The form pre-fills this rate; each campaign can still use its own negotiated price.
            </p>
            <form action={saveChatAdCpmAction} className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="label !text-[10px]" htmlFor="chatAdCpm">
                  Price per 1000 views ({symbol})
                </label>
                <input
                  id="chatAdCpm"
                  name="chatAdCpm"
                  type="number"
                  min={0}
                  max={100000}
                  defaultValue={cpm}
                  className="field !py-1.5 text-xs"
                />
              </div>
              <button className="btn btn-primary !py-2 text-xs">Save rate</button>
            </form>
            <div className="mt-3 rounded-xl border border-line bg-slate-50/70 p-3 text-[11px] leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-700">How billing works</p>
              <p className="mt-1">
                10,000 views at {money(cpm, currency)} CPM = {money(10000, currency)} earned. The campaign stops when
                10,000 views have been delivered, even if it is still marked live. A day cap can end it earlier.
              </p>
            </div>
          </section>

          <section className="card p-4">
            <h3 className="text-sm font-bold">List placement insights</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Day-priced rows now count impressions and clicks too, with per-placement reports.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-slate-50/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Placement views</p>
                <p className="mt-0.5 text-lg font-extrabold">{placementTotals.views.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl border border-line bg-slate-50/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Clicks</p>
                <p className="mt-0.5 text-lg font-extrabold">{placementTotals.clicks.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="admin-table-scroll mt-2">
              <table className="admin-table w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="p-1.5">Placement</th>
                    <th className="p-1.5 text-right">Views</th>
                    <th className="p-1.5 text-right">Clicks</th>
                    <th className="p-1.5 text-right">CTR</th>
                    <th className="p-1.5 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {placements.slice(0, 12).map((row) => (
                    <tr key={row.id}>
                      <td className="p-1.5">
                        <p className="font-medium text-ink">{row.name}</p>
                        <p className="text-[10px] text-muted">{row.label}</p>
                      </td>
                      <td className="p-1.5 text-right">{row.views.toLocaleString("en-IN")}</td>
                      <td className="p-1.5 text-right">{row.clicks.toLocaleString("en-IN")}</td>
                      <td className="p-1.5 text-right">{row.ctr.toFixed(2)}%</td>
                      <td className="p-1.5 text-right">
                        <Link href={row.reportHref} className="font-semibold text-brand hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {placements.length === 0 ? <p className="py-3 text-xs text-muted">No list placements yet.</p> : null}
            </div>
          </section>
        </div>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Chat campaigns ({ads.length})</h3>
            <p className="mt-0.5 text-[11px] text-muted">
              A finished campaign disappears from chat automatically. Pausing keeps the counters and the report.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">
            Delivered value {money(summary.deliveredValue, currency)}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {ads.map((ad) => {
            const creative = chatAdCreative(db, ad);
            const status = chatAdStatus(ad);
            const progress = chatAdProgress(ad);
            return (
              <div key={ad.id} className="rounded-xl border border-line bg-slate-50/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <AiLogo
                    slug={creative.slug}
                    logo={creative.logo}
                    color={creative.color}
                    size={34}
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-ink">{ad.name}</p>
                      <span className={`chip ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-500"}`}>{status}</span>
                      <span className="chip bg-white text-slate-600">{creative.name}</span>
                    </div>
                    <p className="truncate text-[11px] text-muted">
                      {ad.advertiserEmail} · {money(ad.cpm, currency)} CPM ·{" "}
                      {ad.until ? `day cap ${ad.until}` : "view budget only"} · created {ad.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink">
                      {ad.viewsServed.toLocaleString("en-IN")} / {ad.viewsPurchased.toLocaleString("en-IN")} views
                    </p>
                    <p className="text-[10px] text-muted">
                      {chatAdViewsLeft(ad).toLocaleString("en-IN")} left · {ad.clicks.toLocaleString("en-IN")} clicks ·{" "}
                      {ad.viewsServed > 0 ? ((ad.clicks / ad.viewsServed) * 100).toFixed(2) : "0.00"}% CTR
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className={`block h-full rounded-full ${progress >= 100 ? "bg-indigo-500" : "bg-emerald-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span>
                    Booked <strong>{money(chatAdBookedValue(ad), currency)}</strong> · delivered{" "}
                    <strong>{money(chatAdDeliveredValue(ad), currency)}</strong>
                  </span>
                  <Link href={chatAdReportPath(ad.reportToken)} className="font-semibold text-brand hover:underline">
                    Advertiser report ↗
                  </Link>
                  <form action={toggleChatAdAction} className="ml-auto">
                    <input type="hidden" name="id" value={ad.id} />
                    <button className="btn btn-ghost !px-2 !py-1 text-xs" disabled={ad.viewsServed >= ad.viewsPurchased}>
                      {ad.active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteChatAdAction}>
                    <input type="hidden" name="id" value={ad.id} />
                    <DeleteButton label="Delete" message={`Remove the chat campaign ${ad.name}?`} />
                  </form>
                </div>
              </div>
            );
          })}
          {ads.length === 0 ? (
            <p className="rounded-xl border border-line bg-slate-50/60 p-6 text-center text-sm text-muted">
              No chat campaigns yet. Create one above and it appears in every community room.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
