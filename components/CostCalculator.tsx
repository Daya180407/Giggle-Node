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

export default function CostCalculator({
  categoryLabel,
  unitLabel,
  defaultQty,
  options,
  currency = "USD",
  usdRate = 88,
}: {
  categoryLabel: string;
  unitLabel: string;
  defaultQty: number;
  options: CostOption[];
  currency?: "INR" | "USD";
  usdRate?: number;
}) {
  const [qty, setQty] = useState(defaultQty);
  const money = (usd: number) =>
    currency === "INR"
      ? `₹${Math.round(usd * (usdRate || 88)).toLocaleString("en-IN")}`
      : `$${usd.toFixed(usd < 100 ? 2 : 0)}`;

  const rows = options
    .map((o) => {
      const monthly = o.priceType === "free" ? 0 : o.planPrice + qty * o.unitCost;
      return { ...o, monthly: Math.round(monthly * 100) / 100 };
    })
    .sort((a, b) => a.monthly - b.monthly || b.score - a.score)
    .slice(0, 4);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="display text-base text-ink">Cost calculator</h3>
          <p className="text-xs text-muted">Estimate your monthly {categoryLabel.toLowerCase()} AI spend.</p>
        </div>
        <span className="chip bg-slate-100 text-slate-600">{currency}</span>
      </div>

      <label className="label mt-4" htmlFor="qty">
How much do you need? ({unitLabel})
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

      <div className="mt-4 space-y-1">
        {rows.map((row, i) => (
          <div
            key={row.slug}
            className={`flex items-center gap-2 border-l-2 py-1.5 pl-2 ${i === 0 ? "border-green-300" : "border-line"}`}
          >
            <AiLogo slug={row.slug} logo={row.logo} color={row.color} size={32} rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <Link href={`/ai/${row.slug}`} className="block truncate text-sm font-medium hover:text-brand">
                {row.name}
              </Link>
              <span className="text-xs text-muted">
                {row.priceType === "free" ? "Free plan" : `${money(row.planPrice)}/mo plan + usage`}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-bold">{money(row.monthly)}</span>
              {i === 0 ? <span className="text-[10px] font-semibold uppercase text-green-600">Lowest</span> : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        This is an estimate — your real bill depends on the plan, taxes and usage limits.
      </p>
    </div>
  );
}
