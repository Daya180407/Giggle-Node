"use client";

import { useState } from "react";
import { saveChatAdAction } from "@/app/actions";

/**
 * Admin form for a sponsored chat card. Views are the product: the admin buys a
 * view budget and the card stops as soon as that budget has been served. The
 * estimated charge updates while typing.
 */
export default function ChatAdForm({
  ais,
  apps,
  defaultCpm,
  currencySymbol,
}: {
  ais: { id: string; name: string; categoryName: string }[];
  apps: { slug: string; name: string; kind: "mobile" | "desktop" }[];
  defaultCpm: number;
  currencySymbol: string;
}) {
  const [targetType, setTargetType] = useState<"ai" | "app">("ai");
  const [target, setTarget] = useState(ais[0] ? `ai:${ais[0].id}` : "");
  const [views, setViews] = useState(10000);
  const [cpm, setCpm] = useState(defaultCpm);

  const targets =
    targetType === "ai"
      ? ais.map((ai) => ({ value: `ai:${ai.id}`, label: `${ai.name} · ${ai.categoryName}` }))
      : apps.map((app) => ({ value: `app:${app.slug}`, label: `${app.name} · ${app.kind}` }));
  const estimated = Math.ceil((Math.max(0, views) / 1000) * Math.max(0, cpm));

  function switchType(next: "ai" | "app") {
    setTargetType(next);
    if (next === "ai") setTarget(ais[0] ? `ai:${ais[0].id}` : "");
    else setTarget(apps[0] ? `app:${apps[0].slug}` : "");
  }

  return (
    <form action={saveChatAdAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="chatAdName">
          Campaign / advertiser name
        </label>
        <input
          id="chatAdName"
          name="name"
          required
          minLength={2}
          maxLength={90}
          className="field"
          placeholder="Acme AI — launch week"
        />
      </div>
      <div>
        <label className="label" htmlFor="chatAdEmail">
          Advertiser email (for the report link)
        </label>
        <input
          id="chatAdEmail"
          name="advertiserEmail"
          type="email"
          required
          className="field"
          placeholder="ads@acme.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="chatAdTargetType">
          What is being promoted?
        </label>
        <select
          id="chatAdTargetType"
          value={targetType}
          onChange={(event) => switchType(event.target.value === "app" ? "app" : "ai")}
          className="field"
        >
          <option value="ai">AI tool</option>
          <option value="app">App / software</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="chatAdTarget">
          Listing
        </label>
        <select
          id="chatAdTarget"
          name="target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="field"
          required
        >
          {targets.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
        {targets.length === 0 ? (
          <p className="mt-1 text-[11px] text-rose-600">Add a listing of this type first.</p>
        ) : null}
      </div>
      <div>
        <label className="label" htmlFor="chatAdHeadline">
          Headline (shown in chat)
        </label>
        <input
          id="chatAdHeadline"
          name="headline"
          required
          minLength={4}
          maxLength={80}
          className="field"
          placeholder="Write 10× faster with Acme AI"
        />
      </div>
      <div>
        <label className="label" htmlFor="chatAdCta">
          Button label
        </label>
        <input
          id="chatAdCta"
          name="ctaLabel"
          maxLength={24}
          defaultValue="Try it free"
          className="field"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="chatAdBody">
          One-line description
        </label>
        <input
          id="chatAdBody"
          name="body"
          required
          minLength={4}
          maxLength={160}
          className="field"
          placeholder="Draft, edit and publish in one place. Free plan, no card needed."
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="chatAdUrl">
          Destination URL (optional — defaults to the listing)
        </label>
        <input
          id="chatAdUrl"
          name="url"
          className="field"
          placeholder="https://acme.com/offer"
          inputMode="url"
        />
      </div>
      <div>
        <label className="label" htmlFor="chatAdViews">
          Views bought
        </label>
        <input
          id="chatAdViews"
          name="viewsPurchased"
          type="number"
          min={100}
          max={5000000}
          step={100}
          value={views}
          onChange={(event) => setViews(Number(event.target.value) || 0)}
          className="field"
          required
        />
        <p className="mt-1 text-[11px] text-muted">
          The ad stops by itself after exactly this many delivered views.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="chatAdCpm">
          CPM — price per 1000 views ({currencySymbol})
        </label>
        <input
          id="chatAdCpm"
          name="cpm"
          type="number"
          min={0}
          max={100000}
          value={cpm}
          onChange={(event) => setCpm(Number(event.target.value) || 0)}
          className="field"
          required
        />
        <button type="button" onClick={() => setCpm(defaultCpm)} className="mt-1 text-[11px] font-semibold text-brand">
          Use default rate
        </button>
      </div>
      <div>
        <label className="label" htmlFor="chatAdDays">
          Also end after (days, 0 = view budget only)
        </label>
        <input id="chatAdDays" name="days" type="number" min={0} max={3650} defaultValue={0} className="field" />
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Estimated charge</p>
        <p className="mt-1 text-xl font-extrabold text-ink">
          {currencySymbol}
          {estimated.toLocaleString("en-IN")}
        </p>
        <p className="text-[10.5px] text-emerald-800">
          {Math.max(0, views).toLocaleString("en-IN")} views × {currencySymbol}
          {Math.max(0, cpm).toLocaleString("en-IN")} / 1000
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900 sm:col-span-2">
        Shown inline in every community room after each block of messages (admin setting, default every 20). Every card
        carries a <strong>Sponsored</strong> label, counts a view when it becomes visible and a click on its button. The
        advertiser report link is generated automatically.
      </div>

      <button className="btn btn-primary !py-2 text-xs sm:col-span-2" disabled={!targets.length}>
        Create sponsored chat campaign
      </button>
    </form>
  );
}
