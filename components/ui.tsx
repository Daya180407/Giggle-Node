import type { ReactNode } from "react";
import type { PriceType } from "@/lib/types";

export { default as AiLogo } from "@/components/AiLogo";

export function Stars({
  value,
  size = 18,
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
      {star("#E5E8F0")}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {star("#F59E0B")}
      </span>
    </span>
  );
}

export function PriceBadge({ price }: { price: PriceType }) {
  const map = {
    free: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    freemium: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    paid: "bg-orange-50 text-orange-700 border border-orange-200",
  };
  const label = { free: "Free", freemium: "Freemium", paid: "Paid" };
  return <span className={`chip ${map[price]}`}>{label[price]}</span>;
}

export function Trend({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center text-xs font-semibold text-emerald-600" title="Trending up">
        ▲
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center text-xs font-semibold text-rose-500" title="Trending down">
        ▼
      </span>
    );
  return (
    <span className="text-xs text-slate-300" title="Steady">
      –
    </span>
  );
}

export function SponsoredTag() {
  return (
    <span className="chip bg-slate-100 text-slate-500" title="Paid placement">
      Sponsored
    </span>
  );
}

export function RankBadge({ rank, size = "md" }: { rank: number; size?: "sm" | "md" }) {
  const tone = rank === 1 ? "medal-1" : rank === 2 ? "medal-2" : rank === 3 ? "medal-3" : "medal-plain";
  return (
    <span className={`medal ${tone} ${size === "sm" ? "h-6 w-6 text-[11px]" : "h-8 w-8"}`}>
      {rank === 1 ? "1" : rank}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display text-[clamp(1.65rem,3vw,2.3rem)] leading-tight text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
