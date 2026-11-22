import Link from "next/link";
import AiLogo from "@/components/AiLogo";
import { PriceBadge, Stars } from "@/components/ui";

export type PromoItem = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  score: number;
  votes: number;
  planPrice: number;
  /** formatted by the homepage using the site currency setting */
  priceLabel?: string;
  category: string;
  bestFor: string;
  website: string;
};

/**
 * Clearly labelled paid placements. The ranking formula never reads this list,
 * so promoted tools still have to earn their score from real ratings.
 */
export default function PaidPromo({ items }: { items: PromoItem[] }) {
  if (!items.length) return null;

  return (
    <div className="dark-panel promo-panel relative overflow-hidden rounded-none">
      <div className="aurora opacity-30" aria-hidden />
      <div className="pointer-events-none absolute inset-0 promo-grid opacity-40" aria-hidden />

      <div className="relative flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <span className="chip border border-amber-300/30 bg-amber-300/10 text-amber-200">
            <span aria-hidden>◆</span> Promoted
          </span>
          <h2 className="display mt-2 text-xl text-white sm:text-2xl">Paid AI picks worth upgrading to</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Tools with real paid plans, promoted by their makers. Placement is labelled and never changes the
            leaderboard score.
          </p>
        </div>
        <span className="chip border border-white/15 bg-white/5 text-slate-300">Ad · paid placement</span>
      </div>

      <div className="relative grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
        {items.slice(0, 3).map((item, i) => (
          <article
            key={item.slug}
            className="promo-card anim-rise group relative flex flex-col rounded-2xl p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
              Promoted
            </span>
            <div className="flex items-center gap-2.5">
              <AiLogo slug={item.slug} logo={item.logo} color={item.color} size={48} rounded="rounded-xl" />
              <div className="min-w-0">
                <Link
                  href={`/ai/${item.slug}`}
                  className="block truncate text-sm font-bold text-white transition hover:text-cyan-200"
                >
                  {item.name}
                </Link>
                <span className="text-[11px] text-slate-400">{item.category}</span>
              </div>
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">{item.bestFor}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Stars value={item.score} size={15} />
              <span className="text-xs font-bold text-white">{item.score.toFixed(1)}</span>
              <span className="text-[11px] text-slate-400">({item.votes.toLocaleString("en-US")})</span>
              <PriceBadge price="paid" />
            </div>

            <div className="mt-auto flex items-end justify-between gap-2 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Starting plan</p>
                <p className="text-base font-extrabold text-white">{item.priceLabel ?? `$${item.planPrice}/mo`}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href={`/ai/${item.slug}`} className="btn !bg-white/95 !py-1.5 !text-ink hover:!bg-white text-xs">
                  See details
                </Link>
                <a
                  href={`/go/${item.slug}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="btn border border-white/20 !bg-white/5 !py-1.5 text-xs text-white hover:!bg-white/10"
                  aria-label={`Visit ${item.name} official site`}
                >
                  Visit ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="relative border-t border-white/10 px-4 py-3 text-[11px] text-slate-400 sm:px-6">
        Want to promote a tool? <Link href="/contact" className="text-cyan-200 hover:text-white">Get in touch</Link> — every
        placement stays labelled, and reviews cannot be bought.
      </p>
    </div>
  );
}
