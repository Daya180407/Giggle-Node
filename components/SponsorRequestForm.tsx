"use client";

import { useActionState, useState } from "react";
import { submitSponsorRequestAction } from "@/app/actions";
import { money, SPONSOR_SLOTS, sponsorSlotsFor } from "@/lib/sponsors";
import type { SponsorSlotKey } from "@/lib/types";

/**
 * Public advertising request. The price is quoted live from the admin-set slot
 * prices, but the server re-reads it before saving the request. Payment is
 * arranged manually with the team.
 */
export default function SponsorRequestForm({
  ais,
  apps,
  categories,
  prices,
  categoryPrices,
  currency,
}: {
  ais: { id: string; name: string; categoryName: string }[];
  apps: { slug: string; name: string; kind: "mobile" | "desktop" }[];
  categories: { slug: string; name: string }[];
  prices: Record<SponsorSlotKey, number>;
  /** per-category top-3 price; fallback is the shared top3 price */
  categoryPrices: Record<string, number>;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(submitSponsorRequestAction, { ok: false });
  const [targetType, setTargetType] = useState<"ai" | "app">("ai");
  const [listKey, setListKey] = useState("all");
  const [target, setTarget] = useState(ais[0] ? `ai:${ais[0].id}` : "");
  const [slot, setSlot] = useState<SponsorSlotKey>("list5");

  const appKind = listKey === "desktop" ? "desktop" : "mobile";
  const targets =
    targetType === "ai"
      ? ais.map((ai) => ({ value: `ai:${ai.id}`, label: `${ai.name} · ${ai.categoryName}` }))
      : apps.filter((app) => app.kind === appKind).map((app) => ({ value: `app:${app.slug}`, label: app.name }));
  // The trending card only exists in the trending grid; app requests start at list5.
  const slotChoices = sponsorSlotsFor(targetType, listKey);
  const selectedSlot = slotChoices.find((row) => row.key === slot) ?? slotChoices[0];
  // The category podium can carry its own price; everything else uses the slot price.
  const quoteFor = (key: SponsorSlotKey) =>
    key === "top3" && targetType === "ai" && listKey !== "all" && listKey !== "trending"
      ? (categoryPrices[listKey] ?? prices.top3 ?? 0)
      : (prices[key] ?? 0);
  const listLabel =
    targetType === "ai"
      ? listKey === "trending"
        ? "Trending AI tools this week"
        : listKey === "all"
          ? "All AI leaderboard"
          : `${categories.find((row) => row.slug === listKey)?.name ?? listKey} AI ranking`
      : listKey === "desktop"
        ? "PC software list"
        : "Mobile apps list";

  function switchType(next: "ai" | "app") {
    setTargetType(next);
    if (next === "ai") {
      setListKey("all");
      setTarget(ais[0] ? `ai:${ais[0].id}` : "");
    } else {
      setListKey("mobile");
      if (slot === "top3" || slot === "trending") setSlot("list5");
      const first = apps.find((app) => app.kind === "mobile");
      setTarget(first ? `app:${first.slug}` : "");
    }
  }

  function switchList(next: string) {
    setListKey(next);
    if (next === "trending") setSlot("trending");
    else if (slot === "trending") setSlot("list5");
    if (targetType === "app") {
      const first = apps.find((app) => app.kind === (next === "desktop" ? "desktop" : "mobile"));
      setTarget(first ? `app:${first.slug}` : "");
    }
  }

  if (state.ok && state.message) {
    return (
      <div className="card border-emerald-200 bg-emerald-50/70 p-5">
        <h2 className="display text-lg text-emerald-900">Request sent ✓</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">{state.message}</p>
        {state.payUrl ? (
          <a href={state.payUrl} className="btn btn-primary mt-3 w-full !py-2.5 text-xs sm:w-auto">
            Pay now to book the placement →
          </a>
        ) : (
          <p className="mt-2 text-xs text-emerald-700">
            Nothing was charged automatically — continue on the checkout page, or pay the manual invoice we send you.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="display text-lg text-ink">Request a sponsored placement</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Fill this in and continue to the secure checkout — UPI for Indian accounts, cards from anywhere. If online
          payment is paused, our team emails the invoice for a manual UPI or bank transfer.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company">
            Company / product
          </label>
          <input id="company" name="company" required maxLength={90} className="field" placeholder="Acme AI" />
        </div>
        <div>
          <label className="label" htmlFor="contactName">
            Your name
          </label>
          <input id="contactName" name="contactName" required maxLength={80} className="field" placeholder="Full name" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required maxLength={160} className="field" placeholder="you@company.com" />
        </div>
        <div>
          <label className="label" htmlFor="website">
            Website (optional)
          </label>
          <input id="website" name="website" className="field" placeholder="https://…" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="targetType">
            What are you promoting?
          </label>
          <select
            id="targetType"
            value={targetType}
            onChange={(event) => switchType(event.target.value === "app" ? "app" : "ai")}
            className="field"
          >
            <option value="ai">An AI tool</option>
            <option value="app">An app or software</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="listKey">
            Where should it appear?
          </label>
          <select
            id="listKey"
            name="listKey"
            value={listKey}
            onChange={(event) => switchList(event.target.value)}
            className="field"
          >
            {targetType === "ai" ? (
              <>
                <option value="all">All AI leaderboard</option>
                <option value="trending">Trending this week (homepage)</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} AI ranking
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="mobile">Mobile apps list</option>
                <option value="desktop">PC software list</option>
              </>
            )}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="target">
            Which listing?
          </label>
          <select
            id="target"
            name="target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="field"
          >
            {targets.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="label">Choose a position</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {slotChoices.map((row) => {
            const active = row.key === slot;
            return (
              <label
                key={row.key}
                className={`flex cursor-pointer items-start justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${
                  active ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-indigo-200"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-ink">{row.short}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-muted">{row.label}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-bold text-ink">{money(quoteFor(row.key), currency)}</span>
                  <span className="text-[9.5px] text-muted">/ 30 days</span>
                </span>
                <input
                  type="radio"
                  name="slot"
                  value={row.key}
                  checked={active}
                  onChange={() => setSlot(row.key)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="message">
          Anything we should know?
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={1200}
          rows={4}
          className="field"
          placeholder="Campaign goals, preferred start date, invoice details…"
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-900">
        <strong>Your quote:</strong> {money(quoteFor(slot), currency)} for 30 days — after #
        {selectedSlot.position === 1 ? "1 (top-3 card)" : selectedSlot.position} in{" "}
        <strong>{listLabel}</strong>. The listing keeps its real rank and is labelled Sponsored.
      </div>

      <button className="btn btn-primary w-full !py-2.5 text-xs sm:w-auto" disabled={pending || !targets.length}>
        {pending ? "Sending…" : "Send sponsorship request"}
      </button>
      <p className="text-[10.5px] leading-relaxed text-muted">
        Sending this request does not charge anything. Placement goes live only after the payment is confirmed and an
        admin approves it.
      </p>
    </form>
  );
}
