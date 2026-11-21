import type { ReactNode } from "react";
import type { PriceType } from "@/lib/types";

export function AiLogo({
  logo,
  color,
  size = 44,
  rounded = "rounded-xl",
}: {
  logo: string;
  color: string;
  size?: number;
  rounded?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${rounded}`}
      style={{
        width: size,
        height: size,
        background: `${color}14`,
        border: `1px solid ${color}22`,
        fontSize: size * 0.48,
        lineHeight: 1,
      }}
    >
      {logo}
    </span>
  );
}

export function Stars({
  value,
  size = 15,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const total = size * 5 + 8;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const star = (fill: string) => (
    <span className="flex gap-0.5" style={{ color: fill, width: total }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 1.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.75L4.8 17.7l1-5.8L1.6 7.75l5.8-.85L10 1.6z" />
        </svg>
      ))}
    </span>
  );
  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: total, height: size }}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {star("#E2E8F0")}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {star("#F59E0B")}
      </span>
    </span>
  );
}

export function PriceBadge({ price }: { price: PriceType }) {
  const map = {
    free: "bg-green-50 text-green-700 border border-green-200",
    freemium: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    paid: "bg-orange-50 text-orange-700 border border-orange-200",
  };
  const label = { free: "Free", freemium: "Freemium", paid: "Paid" };
  return <span className={`chip ${map[price]}`}>{label[price]}</span>;
}

export function Trend({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600" title="Trending up">
        ▲
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-500" title="Trending down">
        ▼
      </span>
    );
  return <span className="text-xs text-slate-300" title="Steady">–</span>;
}

export function SponsoredTag() {
  return (
    <span className="chip bg-slate-100 text-slate-500" title="Paid placement">
      Sponsored
    </span>
  );
}

export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
