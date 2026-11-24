import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  adCtr,
  chatAdBookedValue,
  chatAdDeliveredValue,
  chatAdEnded,
  chatAdProgress,
  chatAdStatus,
  chatAdViewsLeft,
} from "@/lib/ads";
import { getSiteSettings } from "@/lib/settings";
import { money, placementListLabel } from "@/lib/sponsors";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sponsored campaign report",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/**
 * Advertiser-facing performance report. The link carries an unguessable token
 * generated with the campaign, so no login is needed and no other campaign can
 * be read from the same page. Chat campaigns are view-budgeted; list placements
 * are day-priced, but both reports show the same views / clicks / CTR.
 */
export default async function SponsorReportPage({ params }: Props) {
  const { token } = await params;
  const db = readDb();
  const settings = getSiteSettings(db);
  const currency = settings.appearance.currency;

  const chatAd = (db.chatAds ?? []).find((row) => row.reportToken === token);
  const placement = chatAd
    ? undefined
    : (db.sponsorPlacements ?? []).find((row) => row.reportToken === token || row.id === token);

  if (!chatAd && !placement) notFound();

  const views = chatAd ? chatAd.viewsServed : placement?.views ?? 0;
  const clicks = chatAd ? chatAd.clicks : placement?.clicks ?? 0;
  const ctr = adCtr(views, clicks);
  const status = chatAd
    ? chatAdStatus(chatAd)
    : placement?.active
      ? "Running"
      : "Paused";
  const booked = chatAd ? chatAdBookedValue(chatAd) : placement?.amount ?? 0;
  const delivered = chatAd ? chatAdDeliveredValue(chatAd) : 0;
  const title = chatAd?.name ?? placement?.targetName ?? "Sponsored campaign";
  const targetName = chatAd?.targetName ?? placement?.targetName ?? "";
  const listLabel = placement ? placementListLabel(placement) : "Community chat · all rooms";
  const progress = chatAd ? chatAdProgress(chatAd) : status === "Running" ? 100 : 0;
  const remaining = chatAd ? chatAdViewsLeft(chatAd) : 0;
  const dateRange = chatAd
    ? `${chatAd.createdAt.slice(0, 10)}${chatAd.until ? ` → ${chatAd.until}` : " → until views are delivered"}`
    : `${placement?.createdAt.slice(0, 10)}${placement?.until ? ` → ${placement.until}` : " → open-ended"}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">{settings.siteName} · advertiser report</p>
          <h1 className="display mt-1 text-2xl text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {targetName} · {listLabel}
          </p>
        </div>
        <span
          className={`chip ${
            status === "Running"
              ? "bg-emerald-50 text-emerald-700"
              : status === "Finished"
                ? "bg-indigo-50 text-indigo-700"
                : status === "Expired"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Views delivered", value: views.toLocaleString("en-IN") },
          { label: "Clicks", value: clicks.toLocaleString("en-IN") },
          { label: "CTR", value: `${ctr.toFixed(2)}%` },
          {
            label: chatAd ? "Views left" : "Booking",
            value: chatAd ? remaining.toLocaleString("en-IN") : money(booked, currency),
          },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      {chatAd ? (
        <section className="card mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">View budget</h2>
            <span className="text-xs text-muted">
              {views.toLocaleString("en-IN")} of {chatAd.viewsPurchased.toLocaleString("en-IN")} views
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <span
              className={`block h-full rounded-full ${progress >= 100 ? "bg-indigo-500" : "bg-emerald-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            This card stops automatically when the bought views are delivered{chatAdEnded(chatAd.until) ? " or its day cap passes" : ""}.
            {progress >= 100
              ? " The full budget has now been delivered."
              : ` ${remaining.toLocaleString("en-IN")} views remain at the current CPM.`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-slate-50/70 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">CPM</p>
              <p className="text-sm font-bold">{money(chatAd.cpm, currency)}</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50/70 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">Booked value</p>
              <p className="text-sm font-bold">{money(booked, currency)}</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50/70 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">Delivered value</p>
              <p className="text-sm font-bold">{money(delivered, currency)}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="card mt-4 p-4 text-sm text-slate-600">
          <p>
            This is a day-priced list placement. Views and clicks are counted from the sponsored row on{" "}
            <strong>{listLabel}</strong>; the booking amount is {money(booked, currency)}.
          </p>
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-bold">Campaign details</h2>
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-line py-1.5">
            <dt className="text-muted">Advertiser</dt>
            <dd className="font-semibold text-ink">{chatAd?.advertiserEmail ?? "List placement"}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-line py-1.5">
            <dt className="text-muted">Dates</dt>
            <dd className="font-semibold text-ink">{dateRange}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-line py-1.5">
            <dt className="text-muted">Placement</dt>
            <dd className="font-semibold text-ink">{listLabel}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-line py-1.5">
            <dt className="text-muted">Price model</dt>
            <dd className="font-semibold text-ink">{chatAd ? "Per 1000 views (CPM)" : "Per day booking"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          A view is counted once when the sponsored card is at least a third visible on screen. A click is counted when
          the sponsored button or row is opened. Refreshing a page does not create extra clicks, and a finished campaign
          stops collecting views.
        </p>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Link href="/sponsor" className="text-sm font-semibold text-brand hover:underline">
          ← Sponsorship options
        </Link>
        <p className="text-[10.5px] text-muted">Private report link — do not share publicly.</p>
      </div>
    </div>
  );
}
