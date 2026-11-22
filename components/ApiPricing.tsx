import { formatContext, formatUsd, pricingSummary, type ApiPricingInfo } from "@/lib/api-pricing";

export function ApiPricingInline({ pricing }: { pricing: ApiPricingInfo }) {
  if (!pricing.available) {
    return (
      <div className="min-w-0">
        <span className="chip bg-slate-100 text-slate-600">Subscription only</span>
        <p className="mt-1 max-w-full text-[11px] leading-snug text-muted">{pricing.note}</p>
        <a
          href={pricing.source}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-1 inline-block text-[10px] font-semibold text-brand hover:underline"
        >
          Check plans ↗
        </a>
      </div>
    );
  }

  const context = formatContext(pricing.contextWindow);
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-ink">{pricingSummary(pricing)}</p>
      <p className="mt-0.5 text-[10px] text-muted">
        {pricing.output !== null && pricing.unit === "1M tokens" ? "per 1M tokens" : `per ${pricing.unit}`}
        {context ? ` · ${context} context` : ""}
        {pricing.estimated ? " · est." : ""}
        {pricing.manual ? " · admin verified" : ""}
      </p>
      {pricing.note && !pricing.estimated ? (
        <p className="mt-1 max-w-full text-[11px] leading-snug text-muted">{pricing.note}</p>
      ) : null}
      <a
        href={pricing.source}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="mt-1 inline-block text-[10px] font-semibold text-brand hover:underline"
      >
        {pricing.estimated ? "Provider site ↗" : "Official rates ↗"}
      </a>
    </div>
  );
}

export default function ApiPricing({ pricing, detail = false }: { pricing: ApiPricingInfo; detail?: boolean }) {
  if (!pricing.available) {
    return (
      <div>
        <span className="chip bg-slate-100 text-slate-600">No public API</span>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{pricing.note}</p>
        <a
          href={pricing.source}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
        >
          View provider plans ↗
        </a>
      </div>
    );
  }

  const context = formatContext(pricing.contextWindow);
  return (
    <div>
      <div className={`grid gap-3 ${detail ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {pricing.output !== null && pricing.unit === "1M tokens" ? "Input" : "API rate"}
          </p>
          <p className="mt-1 text-xl font-extrabold text-ink">{formatUsd(pricing.input)}</p>
          <p className="text-[10px] text-muted">per {pricing.unit}</p>
        </div>
        {pricing.output !== null ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Output</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{formatUsd(pricing.output)}</p>
            <p className="text-[10px] text-muted">per {pricing.unit}</p>
          </div>
        ) : null}
        {detail && context ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Context</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{context}</p>
            <p className="text-[10px] text-muted">tokens</p>
          </div>
        ) : null}
        {detail ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Availability</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">Public API</p>
            <p className="text-[10px] text-muted">pay as you go</p>
          </div>
        ) : null}
      </div>

      {pricing.note ? (
        <p className="mt-3 border-l-2 border-line pl-2.5 text-[11px] leading-relaxed text-slate-600">
          {pricing.note}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {pricing.manual ? "Admin-verified rate. " : pricing.estimated ? "Indicative rate. " : "List price. "}
        Confirm current pricing on the{" "}
        <a
          href={pricing.source}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="font-semibold text-brand hover:underline"
        >
          provider&apos;s pricing page
        </a>
        . Taxes, tiers and batch discounts may apply.
      </p>
    </div>
  );
}
