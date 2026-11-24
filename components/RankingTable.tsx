import Link from "next/link";
import AdTrackerView from "@/components/AdTrackerView";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import { formatVotes } from "@/lib/format";
import { RATED_MIN_VOTES, type AiStat } from "@/lib/rank";
import { insertSponsors, isAiSponsored, slotMeta } from "@/lib/sponsors";
import type { SponsorPlacement } from "@/lib/types";

const MEDALS = ["medal-1", "medal-2", "medal-3"];

export default function RankingTable({
  stats,
  reasons,
  sponsors = [],
}: {
  stats: AiStat[];
  /** optional "why this tool is on this board" keywords, shown as chips */
  reasons?: Record<string, string[]>;
  /** paid insertions; they keep the real rank of the listing they promote */
  sponsors?: { placement: SponsorPlacement; stat: AiStat }[];
}) {
  if (!stats.length && !sponsors.length) {
    return <p className="py-10 text-center text-sm text-muted">No AI tools in this category yet.</p>;
  }

  const ranks = new Map(stats.map((stat, index) => [stat.ai.id, index + 1]));
  const rows = insertSponsors(
    stats,
    sponsors.map((row) => ({
      position: slotMeta(row.placement.slot)?.position ?? 5,
      item: row.stat,
      placement: row.placement,
    })),
  );

  return (
    <div className="divide-y divide-line/80">
      {rows.map(({ item: s, sponsor }) => {
        const rank = ranks.get(s.ai.id) ?? 0;
        const i = rank - 1;
        const isTop = !sponsor && i >= 0 && i < 3 && s.votes >= RATED_MIN_VOTES;
        return (
          <div
            key={`${s.ai.id}${sponsor ? `-sponsor-${sponsor.id}` : ""}`}
            className={`rank-row rank-row-v2 flex items-center gap-2.5 rounded-2xl px-1 py-3 sm:gap-3 sm:px-2 ${isTop ? "rank-top" : ""} ${
              sponsor ? "border border-amber-200 bg-amber-50/40" : ""
            }`}
          >
            {sponsor ? <AdTrackerView kind="placement" id={sponsor.id} /> : null}
            <span
              className={`medal h-8 w-8 shrink-0 ${
                !sponsor && s.votes >= RATED_MIN_VOTES ? (MEDALS[i] ?? "medal-plain") : "medal-plain"
              }`}
              title={sponsor ? `Real rank #${rank}` : undefined}
            >
              {!sponsor && i === 0 && s.votes >= RATED_MIN_VOTES ? "★" : sponsor ? `#${rank}` : rank}
            </span>
            <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/ai/${s.ai.slug}`} className="truncate font-semibold text-ink transition hover:text-brand">
                  {s.ai.name}
                </Link>
                {sponsor || isAiSponsored(s.ai) ? <SponsoredTag /> : null}
                {!sponsor && s.trend === "up" ? <Trend trend="up" /> : null}
                {s.votes > 0 && s.votes < RATED_MIN_VOTES ? (
                  <span className="chip bg-slate-100 text-[9.5px] text-slate-500" title="Fewer than 10 votes so far">
                    Early signal
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted">{s.ai.bestFor.join(" · ")}</p>
              {sponsor ? (
                <p className="mt-0.5 text-[10.5px] font-medium text-amber-700">
                  Sponsored placement · real rank #{rank} in this list
                </p>
              ) : null}
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
                {s.votes > 0 ? (
                  <>
                    <Stars value={s.score} size={15} />
                    <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                      ★ {s.score.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted">({formatVotes(s.votes)})</span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">New · no ratings yet</span>
                )}
              </div>
            </div>

            <div className="hidden w-28 shrink-0 sm:block">
              {s.votes > 0 ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{s.score.toFixed(1)}</span>
                    <span className="text-muted">{formatVotes(s.votes)}</span>
                  </div>
                  <div className="score-bar mt-1.5">
                    <span style={{ width: `${Math.max(6, Math.min(100, (s.score / 5) * 100))}%` }} />
                  </div>
                </>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500">New</span>
              )}
            </div>

            <div className="hidden md:block">
              <PriceBadge price={s.ai.priceType} />
            </div>
            <a
              href={
                sponsor
                  ? `/api/ads/click?k=placement&id=${encodeURIComponent(sponsor.id)}`
                  : `/go/${s.ai.slug}`
              }
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
        );
      })}
    </div>
  );
}
