import { submitPricingReportAction } from "@/app/actions";

/**
 * Public "wrong price" report. Works without JavaScript: a details element
 * reveals the form, and the server action stores the report for the admin inbox.
 */
export default function PricingReport({
  targetType,
  targetId,
  targetName,
  back,
  compact = false,
}: {
  targetType: "ai" | "model" | "app";
  targetId: string;
  targetName: string;
  back: string;
  compact?: boolean;
}) {
  return (
    <details className={compact ? "mt-2" : "mt-4 rounded-xl border border-line bg-slate-50/60 p-3"}>
      <summary
        className={`cursor-pointer text-[11px] font-semibold text-muted transition hover:text-rose-600 ${
          compact ? "list-none" : ""
        }`}
      >
        ⚑ Price galat hai? Report karein
      </summary>
      <form action={submitPricingReportAction} className="mt-2 space-y-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="targetName" value={targetName} />
        <input type="hidden" name="back" value={back} />
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={500}
          rows={compact ? 2 : 3}
          placeholder="Kya galat hai? Sahi plan ya API price bataiye (optional link)."
          className="field resize-none !py-2 text-xs"
          aria-label={`Report wrong pricing for ${targetName}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost !px-2.5 !py-1 text-[11px]">Send report</button>
          <span className="text-[10px] text-muted">Admin panel me report dikhegi.</span>
        </div>
      </form>
    </details>
  );
}
