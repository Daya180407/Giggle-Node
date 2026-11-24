"use client";

import { useState } from "react";
import { addSponsorPlacementAction } from "@/app/actions";
import { appListLabel, money, SPONSOR_SLOTS } from "@/lib/sponsors";
import type { SponsorSlotKey } from "@/lib/types";

/**
 * Admin form for a paid placement. The target select carries both kinds, and
 * the list options switch with it so an AI can never be booked into the app
 * list (or the other way round).
 */
export default function SponsorPlacementForm({
  ais,
  apps,
  categories,
  prices,
  currency,
}: {
  ais: { id: string; name: string; categoryName: string }[];
  apps: { slug: string; name: string; kind: "mobile" | "desktop" }[];
  categories: { slug: string; name: string }[];
  prices: Record<SponsorSlotKey, number>;
  currency: string;
}) {
  const [targetType, setTargetType] = useState<"ai" | "app">("ai");
  const [listKey, setListKey] = useState("all");
  const [target, setTarget] = useState(ais[0] ? `ai:${ais[0].id}` : "");
  const [slot, setSlot] = useState<SponsorSlotKey>("list5");
  const [amount, setAmount] = useState(prices.list5 ?? 0);

  const appKind = listKey === "desktop" ? "desktop" : "mobile";
  const targets =
    targetType === "ai"
      ? ais.map((ai) => ({ value: `ai:${ai.id}`, label: `${ai.name} · ${ai.categoryName}` }))
      : apps.filter((app) => app.kind === appKind).map((app) => ({ value: `app:${app.slug}`, label: app.name }));
  // Only AI categories have a top-three podium; app lists use the list slots.
  const slotChoices = targetType === "ai" ? SPONSOR_SLOTS : SPONSOR_SLOTS.filter((row) => row.key !== "top3");
  const selectedSlot = SPONSOR_SLOTS.find((row) => row.key === slot) ?? SPONSOR_SLOTS[0];
  const listLabel =
    targetType === "ai"
      ? listKey === "all"
        ? "All AI leaderboard"
        : `${categories.find((row) => row.slug === listKey)?.name ?? listKey} AI ranking`
      : appListLabel(listKey);

  function switchType(next: "ai" | "app") {
    setTargetType(next);
    if (next === "ai") {
      setListKey("all");
      setTarget(ais[0] ? `ai:${ais[0].id}` : "");
    } else {
      setListKey("mobile");
      if (slot === "top3") setSlot("list5");
      const first = apps.find((app) => app.kind === "mobile");
      setTarget(first ? `app:${first.slug}` : "");
    }
  }

  function switchList(next: string) {
    setListKey(next);
    if (targetType === "app") {
      const first = apps.find((app) => app.kind === (next === "desktop" ? "desktop" : "mobile"));
      setTarget(first ? `app:${first.slug}` : "");
    }
  }

  function pickSlot(next: SponsorSlotKey) {
    setSlot(next);
    setAmount(prices[next] ?? 0);
  }

  return (
    <form action={addSponsorPlacementAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sponsorTargetType">
            What is being promoted?
          </label>
          <select
            id="sponsorTargetType"
            value={targetType}
            onChange={(event) => switchType(event.target.value === "app" ? "app" : "ai")}
            className="field"
          >
            <option value="ai">AI tool</option>
            <option value="app">App / software</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sponsorListKey">
            Show in this list
          </label>
          <select
            id="sponsorListKey"
            name="listKey"
            value={listKey}
            onChange={(event) => switchList(event.target.value)}
            className="field"
          >
            {targetType === "ai" ? (
              <>
                <option value="all">All AI leaderboard</option>
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
          <label className="label" htmlFor="sponsorTarget">
            Listing
          </label>
          <select
            id="sponsorTarget"
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
          {targets.length === 0 ? (
            <p className="mt-1 text-[11px] text-rose-600">
              No {targetType === "app" ? "apps" : "AI tools"} in this type. Add the listing first, or pick another list.
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sponsorSlot">
            Position
          </label>
          <select
            id="sponsorSlot"
            name="slot"
            value={slot}
            onChange={(event) => pickSlot(event.target.value as SponsorSlotKey)}
            className="field"
          >
            {slotChoices.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label} · {money(prices[row.key] ?? 0, currency)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{selectedSlot.blurb}</p>
        </div>
        <div>
          <label className="label" htmlFor="sponsorAmount">
            Amount charged ({currency === "USD" ? "$" : "₹"})
          </label>
          <input
            id="sponsorAmount"
            name="amount"
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
            className="field"
          />
          <button
            type="button"
            onClick={() => setAmount(prices[slot] ?? 0)}
            className="mt-1 text-[11px] font-semibold text-brand"
          >
            Use slot price ({money(prices[slot] ?? 0, currency)})
          </button>
        </div>
        <div>
          <label className="label" htmlFor="sponsorDays">
            Days booked
          </label>
          <input
            id="sponsorDays"
            name="days"
            type="number"
            min={0}
            defaultValue={30}
            className="field"
          />
          <p className="mt-1 text-[11px] text-muted">0 = no end date.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sponsorNote">
            Internal note
          </label>
          <input
            id="sponsorNote"
            name="note"
            maxLength={200}
            className="field"
            placeholder="Payment reference, invoice number, sales contact…"
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
        Will show <strong>after #{selectedSlot.position === 1 ? "1 (top-3 card)" : selectedSlot.position}</strong> in{" "}
        <strong>{listLabel}</strong>. The listing keeps its real rank and carries a Sponsored tag.
      </div>

      <button className="btn btn-primary !py-2 text-xs" disabled={!targets.length}>
        Add sponsored placement
      </button>
    </form>
  );
}
