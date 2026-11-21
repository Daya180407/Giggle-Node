import Link from "next/link";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import type { AiStat } from "@/lib/rank";

export default function RankingTable({ stats }: { stats: AiStat[] }) {
  if (!stats.length) {
    return <p className="py-10 text-center text-sm text-muted">Is category me abhi koi AI nahi hai.</p>;
  }
  return (
    <div className="divide-y divide-line">
      {stats.map((s, i) => (
        <div key={s.ai.id} className="flex items-center gap-3 py-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
              i === 0
                ? "bg-amber-100 text-amber-700"
                : i === 1
                  ? "bg-slate-100 text-slate-600"
                  : i === 2
                    ? "bg-orange-100 text-orange-700"
                    : "bg-slate-50 text-slate-500"
            }`}
          >
            {i + 1}
          </span>
          <AiLogo logo={s.ai.logo} color={s.ai.color} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/ai/${s.ai.slug}`} className="truncate font-semibold hover:text-brand">
                {s.ai.name}
              </Link>
              {s.ai.sponsored ? <SponsoredTag /> : null}
              {s.trend === "up" ? <Trend trend="up" /> : null}
            </div>
            <p className="truncate text-xs text-muted">{s.ai.bestFor.join(" · ")}</p>
            <div className="mt-1 flex items-center gap-1.5 sm:hidden">
              <Stars value={s.score} size={12} />
              <span className="text-xs font-semibold">{s.score.toFixed(1)}</span>
              <span className="text-xs text-muted">({s.votes})</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Stars value={s.score} size={13} />
            <span className="w-8 text-sm font-semibold">{s.score.toFixed(1)}</span>
            <span className="w-14 text-right text-xs text-muted">{s.votes} votes</span>
          </div>
          <PriceBadge price={s.ai.priceType} />
          <a
            href={s.ai.website}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="btn btn-ghost !px-2 !py-1.5 text-xs"
          >
            Visit
          </a>
        </div>
      ))}
    </div>
  );
}
