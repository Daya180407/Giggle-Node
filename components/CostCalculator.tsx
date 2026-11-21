"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo } from "@/components/ui";

export type CostOption = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  priceType: "free" | "freemium" | "paid";
  planPrice: number;
  unitCost: number;
  score: number;
};

const USD_TO_INR = 85;

export default function CostCalculator({
  categoryLabel,
  unitLabel,
  defaultQty,
  options,
}: {
  categoryLabel: string;
  unitLabel: string;
  defaultQty: number;
  options: CostOption[];
}) {
  const [qty, setQty] = useState(defaultQty);

  const rows = options
    .map((o) => {
      const monthlyUsd = o.priceType === "free" ? 0 : o.planPrice + qty * o.unitCost;
      return { ...o, monthly: Math.round(monthlyUsd * USD_TO_INR) };
    })
    .sort((a, b) => a.monthly - b.monthly || b.score - a.score)
    .slice(0, 4);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">Cost Calculator</h3>
          <p className="text-xs text-muted">{categoryLabel} AI ka mahine ka kharcha estimate kijiye.</p>
        </div>
        <span className="chip bg-slate-100 text-slate-600">₹ INR</span>
      </div>

      <label className="label mt-4" htmlFor="qty">
        Kitna chahiye? ({unitLabel})
      </label>
      <div className="flex items-center gap-3">
        <input
          id="qty"
          type="range"
          min={Math.max(1, Math.round(defaultQty / 10))}
          max={defaultQty * 8}
          step={Math.max(1, Math.round(defaultQty / 10))}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <span className="w-20 shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-center text-sm font-semibold">
          {qty.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.slug}
            className={`flex items-center gap-2 rounded-xl border p-2 ${i === 0 ? "border-green-200 bg-green-50/60" : "border-line"}`}
          >
            <AiLogo logo={row.logo} color={row.color} size={30} />
            <div className="min-w-0 flex-1">
              <Link href={`/ai/${row.slug}`} className="block truncate text-sm font-medium hover:text-brand">
                {row.name}
              </Link>
              <span className="text-xs text-muted">
                {row.priceType === "free" ? "Free plan" : `₹${row.planPrice * USD_TO_INR}/mo plan + usage`}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-bold">{row.monthly === 0 ? "₹0" : `₹${row.monthly}`}</span>
              {i === 0 ? <span className="text-[10px] font-semibold uppercase text-green-600">Sasta</span> : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Ye estimate hai — actual bill tool ke plan, taxes aur usage limits pe depend karta hai.
      </p>
    </div>
  );
}
