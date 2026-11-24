import AdTrackerView from "@/components/AdTrackerView";
import { AiLogo } from "@/components/ui";
import type { ChatAd } from "@/lib/types";

/**
 * A paid chat card, shown inline between messages every N posts. It is always
 * labelled "Sponsored" and carries no rank. The CTA goes through the tracked
 * redirect so clicks show up in the advertiser report.
 */
export default function ChatSponsoredAd({
  ad,
  creative,
}: {
  ad: ChatAd;
  creative: { name: string; logo: string; color: string; slug: string };
}) {
  return (
    <aside
      aria-label="Sponsored"
      className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/95 to-white p-3 shadow-sm"
    >
      <AdTrackerView kind="chat" id={ad.id} />
      <div className="flex items-start gap-2.5">
        <AiLogo slug={creative.slug} logo={creative.logo} color={creative.color} size={38} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-amber-800">
              Sponsored
            </span>
            <span className="text-[10.5px] text-[#667781]">{creative.name}</span>
          </div>
          <p className="mt-1 text-[13.5px] font-semibold leading-snug text-[#111b21]">{ad.headline}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#54656f]">{ad.body}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <a
          href={`/api/ads/click?k=chat&id=${encodeURIComponent(ad.id)}`}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00a884] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#008f72]"
        >
          {ad.ctaLabel} <span aria-hidden>↗</span>
        </a>
        <span className="text-[10px] text-[#8696a0]">Paid placement · not a ranking</span>
      </div>
    </aside>
  );
}
