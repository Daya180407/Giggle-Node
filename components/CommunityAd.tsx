import AdSlot from "./AdSlot";

/**
 * Community ad placement. Uses an AdSense unit when the publisher ID and slot
 * are configured, otherwise a small house ad keeps the space useful. Both are
 * inline only — never a popup, overlay or interstitial.
 */
export default function CommunityAd({
  clientId,
  slotId,
  houseText,
  houseHref,
  variant = "banner",
}: {
  clientId: string;
  slotId: string;
  houseText: string;
  houseHref: string;
  variant?: "banner" | "inline";
}) {
  if (clientId && slotId) return <AdSlot clientId={clientId} slotId={slotId} variant={variant} />;
  if (!houseText) return null;

  return (
    <aside
      aria-label="Advertisement"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-xl border border-line bg-white/70 px-3 py-2"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sponsored</span>
      {houseHref ? (
        <a
          href={houseHref}
          rel="nofollow sponsored noopener"
          className="text-[11.5px] font-semibold text-slate-600 transition hover:text-brand"
        >
          {houseText} →
        </a>
      ) : (
        <span className="text-[11.5px] font-semibold text-slate-600">{houseText}</span>
      )}
    </aside>
  );
}
