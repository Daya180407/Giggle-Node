import Link from "next/link";
import { toggleBookmarkAction } from "@/app/actions";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import { formatVotes } from "@/lib/format";
import type { AiStat } from "@/lib/rank";
import { categoryName } from "@/lib/categories";
import { isAiSponsored } from "@/lib/sponsors";

export default function AiCard({
  stat,
  saved = false,
  back = "/",
  badge,
  sponsored = false,
}: {
  stat: AiStat;
  saved?: boolean;
  back?: string;
  badge?: string;
  /** paid card from a sponsored placement, even when the listing itself is not labelled */
  sponsored?: boolean;
}) {
  const { ai } = stat;
  return (
    <article className="card card-hover group relative flex h-full flex-col overflow-hidden p-4">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={48} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          {badge ? (
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-600">
              <span className="live-dot" aria-hidden />
              {badge}
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/ai/${ai.slug}`} className="truncate font-bold text-ink transition hover:text-brand">
              {ai.name}
            </Link>
            {sponsored || isAiSponsored(ai) ? <SponsoredTag /> : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {categoryName(ai.category)} · {stat.models.length} {stat.models.length === 1 ? "model" : "models"}
          </p>
        </div>
        <form action={toggleBookmarkAction}>
          <input type="hidden" name="aiId" value={ai.id} />
          <input type="hidden" name="back" value={back} />
          <button
            type="submit"
            title={saved ? "Remove from My List" : "Save to My List"}
            aria-label={saved ? "Remove from My List" : "Save to My List"}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
              saved
                ? "border-indigo-200 bg-brand-soft text-brand"
                : "border-line text-slate-400 hover:border-indigo-200 hover:text-brand"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} aria-hidden>
              <path d="M5 3.5h10v13l-5-3.2-5 3.2v-13z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{ai.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {stat.votes > 0 ? (
          <>
            <Stars value={stat.score} size={16} />
            <span className="text-sm font-bold text-ink">{stat.score.toFixed(1)}</span>
            <span className="text-xs text-muted">({formatVotes(stat.votes)})</span>
            <Trend trend={stat.trend} />
          </>
        ) : (
          <span className="chip border border-dashed border-line bg-white text-slate-500">New · no ratings yet</span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <PriceBadge price={ai.priceType} />
          <span className="hidden truncate text-xs text-muted sm:inline">{ai.bestFor.slice(0, 1).join("")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost !px-2.5 !py-1.5 text-xs">
            Details
          </Link>
          <a
            href={`/go/${ai.slug}`}
            target="_blank"
            rel="nofollow noopener noreferrer sponsored"
            className="btn btn-primary !px-2.5 !py-1.5 text-xs"
          >
            Visit
          </a>
        </div>
      </div>
    </article>
  );
}
