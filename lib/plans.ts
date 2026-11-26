import { formatUsd, getApiPricing } from "./api-pricing";
import type { AppEntry } from "./apps/types";
import type { Ai, AppearanceSettings, DB, SubscriptionPlan } from "./types";

export function formatPlanPrice(plan: SubscriptionPlan, _appearance?: AppearanceSettings): string {
  if (plan.priceMonthly <= 0) return "Free";
  // The catalogue is priced in USD everywhere; rupee prices are legacy data only.
  const usd = plan.priceMonthly;
  return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}/mo`;
}

/** Best available API rate across an AI's models, as a short human-readable line. */
export function bestApiSummary(ai: Ai, models: DB["models"]): string {
  const rows = models
    .filter((model) => model.aiId === ai.id)
    .map((model) => getApiPricing(ai, model))
    .filter((pricing) => pricing.available && pricing.input !== null);

  if (!rows.length) return "API: subscription only";
  const cheapest = rows.sort((a, b) => (a.input ?? 0) - (b.input ?? 0))[0];
  const output = cheapest.output !== null && cheapest.unit === "1M tokens" ? ` / ${formatUsd(cheapest.output)} out` : "";
  return `API from ${formatUsd(cheapest.input)} / ${cheapest.unit}${output}`;
}

/** Admin-entered app pricing, falling back to the linked AI's plans and API rates. */
export function appPricingFor(db: DB, entry: AppEntry, ai?: Ai | null) {
  const saved = db.appPricing?.[entry.slug];
  const plans = saved?.plans?.length ? saved.plans : (ai?.plans ?? []);
  const apiFrom = saved?.apiFrom?.trim() || (ai ? bestApiSummary(ai, db.models) : "");
  return {
    plans,
    apiFrom,
    apiNote: saved?.apiNote?.trim() ?? "",
  };
}
