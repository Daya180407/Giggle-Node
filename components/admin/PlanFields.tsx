import type { SubscriptionPlan } from "@/lib/types";

const BLANK: SubscriptionPlan = {
  id: "",
  name: "",
  priceMonthly: 0,
  priceYearly: null,
  priceInr: null,
  note: "",
};

/**
 * Repeatable subscription-plan rows. Empty-name rows are ignored on save, so the
 * admin can add up to six plans without any client-side JavaScript.
 */
export default function PlanFields({
  plans,
  hint,
  rows = 4,
}: {
  plans: SubscriptionPlan[];
  hint?: string;
  rows?: number;
}) {
  const list = [...plans];
  const rowCount = Math.min(6, Math.max(rows, plans.length));
  while (list.length < rowCount) list.push(BLANK);

  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Subscription plans
      </legend>
      <p className="text-[11px] text-muted">
        Shown on the public page and app listing. Rows with an empty name are ignored. Set the price to 0 for a free plan.
      </p>
      <div className="mt-2 space-y-2">
        {list.slice(0, rowCount).map((plan, index) => (
          <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-2 lg:grid-cols-5">
            <input
              name="planName"
              defaultValue={plan.name}
              placeholder={`Plan ${index + 1} (Free, Pro…)`}
              className="field !py-1.5 text-xs"
              aria-label={`Plan ${index + 1} name`}
            />
            <input
              name="planPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={plan.name ? plan.priceMonthly : ""}
              placeholder="USD / month"
              className="field !py-1.5 text-xs"
              aria-label={`Plan ${index + 1} USD per month`}
            />
            <input
              name="planPriceInr"
              type="number"
              min={0}
              step="1"
              defaultValue={plan.priceInr ?? ""}
              placeholder="₹ / month"
              className="field !py-1.5 text-xs"
              aria-label={`Plan ${index + 1} rupees per month`}
            />
            <input
              name="planYearly"
              type="number"
              min={0}
              step="0.01"
              defaultValue={plan.priceYearly ?? ""}
              placeholder="USD / year"
              className="field !py-1.5 text-xs"
              aria-label={`Plan ${index + 1} USD per year`}
            />
            <input
              name="planNote"
              defaultValue={plan.note}
              placeholder="Includes / limits"
              className="field !py-1.5 text-xs"
              aria-label={`Plan ${index + 1} inclusions`}
            />
          </div>
        ))}
      </div>
      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-muted">{hint}</p> : null}
    </fieldset>
  );
}
