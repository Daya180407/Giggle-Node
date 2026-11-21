import Link from "next/link";
import { toggleBookmarkAction } from "@/app/actions";
import { AiLogo, PriceBadge, SponsoredTag, Stars, Trend } from "@/components/ui";
import type { AiStat } from "@/lib/rank";
import { categoryName } from "@/lib/categories";

export default function AiCard({
  stat,
  saved = false,
  back = "/",
}: {
  stat: AiStat;
  saved?: boolean;
  back?: string;
}) {
  const { ai } = stat;
  return (
    <article className="card card-hover flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <AiLogo logo={ai.logo} color={ai.color} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/ai/${ai.slug}`} className="truncate font-bold hover:text-brand">
              {ai.name}
            </Link>
            {ai.sponsored ? <SponsoredTag /> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {categoryName(ai.category)} · {stat.models.length} models
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars value={stat.score} size={13} />
            <span className="text-xs font-semibold text-slate-700">{stat.score.toFixed(1)}</span>
            <span className="text-xs text-muted">({stat.votes})</span>
            <Trend trend={stat.trend} />
          </div>
        </div>
        <form action={toggleBookmarkAction}>
          <input type="hidden" name="aiId" value={ai.id} />
          <input type="hidden" name="back" value={back} />
          <button
            type="submit"
            title={saved ? "Remove from My List" : "Save to My List"}
            className={`rounded-lg border p-1.5 text-sm ${
              saved ? "border-indigo-200 bg-brand-soft text-brand" : "border-line text-slate-400 hover:text-brand"
            }`}
          >
            {saved ? "🔖" : "🏷️"}
          </button>
        </form>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{ai.description}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-1.5">
          <PriceBadge price={ai.priceType} />
          <span className="text-xs text-muted">{stat.votes.toLocaleString("en-IN")} votes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost !px-2.5 !py-1.5 text-xs">
            Detail
          </Link>
          <a
            href={ai.website}
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
