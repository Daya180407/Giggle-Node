"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo } from "@/components/ui";

export type MatrixRow = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  score: number;
  category: string;
  plans: { name: string; price: string; note: string }[];
  apiFrom: string;
  priceType: string;
};

export default function PlanMatrix({ rows, initial = 3 }: { rows: MatrixRow[]; initial?: number }) {
  const [selected, setSelected] = useState<string[]>(rows.slice(0, initial).map((row) => row.slug));
  const active = rows.filter((row) => selected.includes(row.slug));

  function toggle(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : current.length >= 4
          ? [...current.slice(1), slug]
          : [...current, slug],
    );
  }

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {rows.map((row) => {
          const on = selected.includes(row.slug);
          return (
            <button
              key={row.slug}
              type="button"
              onClick={() => toggle(row.slug)}
              aria-pressed={on}
              className={`chip shrink-0 border px-2.5 py-1.5 transition ${
                on
                  ? "border-transparent bg-ink text-white"
                  : "border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
              }`}
            >
              {on ? "✓ " : "+ "}
              {row.name}
            </button>
          );
        })}
      </div>

      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Pick up to four tools to compare their plans side by side.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="matrix-table min-w-[560px] text-left text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="w-32">Compare</th>
                {active.map((row) => (
                  <th key={row.slug}>
                    <Link href={`/ai/${row.slug}`} className="flex items-center gap-2 hover:text-brand">
                      <AiLogo slug={row.slug} logo={row.logo} color={row.color} size={30} rounded="rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-ink">{row.name}</span>
                        <span className="block text-[10px] font-medium text-muted">
                          ★ {row.score.toFixed(1)} · {row.category}
                        </span>
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Free plan</th>
                {active.map((row) => (
                  <td key={row.slug}>
                    {row.plans.some((plan) => plan.price === "Free") || row.priceType !== "paid" ? (
                      <span className="chip bg-emerald-50 text-emerald-700">Available</span>
                    ) : (
                      <span className="text-muted">Paid only</span>
                    )}
                  </td>
                ))}
              </tr>
              {[0, 1, 2].map((index) => (
                <tr key={index}>
                  <th>Plan {index + 1}</th>
                  {active.map((row) => {
                    const plan = row.plans[index];
                    return (
                      <td key={row.slug}>
                        {plan ? (
                          <>
                            <span className="block font-semibold text-ink">{plan.name}</span>
                            <span className="block text-brand">{plan.price}</span>
                            {plan.note ? (
                              <span className="mt-0.5 block text-[10.5px] leading-snug text-muted">{plan.note}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th>API from</th>
                {active.map((row) => (
                  <td key={row.slug} className="text-[11px] leading-snug text-slate-600">
                    {row.apiFrom || "Subscription only"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Up to four tools, cheapest plan first. Prices are list prices for the monthly plan in the site currency; always
        confirm on the provider&apos;s page before paying.
      </p>
    </div>
  );
}
