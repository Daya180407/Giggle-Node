import Link from "next/link";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import { formatVotes } from "@/lib/format";
import type { AiStat } from "@/lib/rank";

const MEDALS = ["medal-1", "medal-2", "medal-3"];

export default function RankingTable({
  stats,
  reasons,
}: {
  stats: AiStat[];
  /** optional "why this tool is on this board" keywords, shown as chips */
  reasons?: Record<string, string[]>;
}) {
  if (!stats.length) {
    return <p className="py-10 text-center text-sm text-muted">No AI tools in this category yet.</p>;
  }

  return (
    <div className="divide-y divide-line/80">
      {stats.map((s, i) => (
        <div
          key={s.ai.id}
          className={`rank-row rank-row-v2 flex items-center gap-2.5 rounded-2xl px-1 py-3 sm:gap-3 sm:px-2 ${i < 3 ? "rank-top" : ""}`}
        >
          <span className={`medal h-8 w-8 shrink-0 ${MEDALS[i] ?? "medal-plain"}`}>{i === 0 ? "★" : i + 1}</span>
          <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/ai/${s.ai.slug}`} className="truncate font-semibold text-ink transition hover:text-brand">
                {s.ai.name}
              </Link>
              {s.ai.sponsored ? <SponsoredTag /> : null}
              {s.trend === "up" ? <Trend trend="up" /> : null}
            </div>
            <p className="truncate text-xs text-muted">{s.ai.bestFor.join(" · ")}</p>
            {reasons?.[s.ai.id]?.length ? (
              <p className="mt-1 flex flex-wrap gap-1">
                {reasons[s.ai.id].slice(0, 3).map((reason) => (
                  <span key={reason} className="chip border border-indigo-100 bg-indigo-50/70 text-[9.5px] text-indigo-700">
                    {reason}
                  </span>
                ))}
              </p>
            ) : null}
            <div className="mt-1 flex items-center gap-1.5 sm:hidden">
              <Stars value={s.score} size={15} />
              <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                ★ {s.score.toFixed(1)}
              </span>
              <span className="text-xs text-muted">({formatVotes(s.votes)})</span>
            </div>
          </div>

          <div className="hidden w-28 shrink-0 sm:block">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">{s.score.toFixed(1)}</span>
              <span className="text-muted">{formatVotes(s.votes)}</span>
            </div>
            <div className="score-bar mt-1.5">
              <span style={{ width: `${Math.max(6, Math.min(100, (s.score / 5) * 100))}%` }} />
            </div>
          </div>

          <div className="hidden md:block">
            <PriceBadge price={s.ai.priceType} />
          </div>
          <a
            href={`/go/${s.ai.slug}`}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            aria-label={`Visit ${s.ai.name}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-brand-soft hover:text-brand"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M7 13l6-6M8 7h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}
