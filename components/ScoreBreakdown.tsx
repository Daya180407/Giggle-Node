import Link from "next/link";
import type { AiStat, View } from "@/lib/rank";
import { formatVotes } from "@/lib/format";
import { scoreBreakdown } from "@/lib/insight";

const CONFIDENCE = {
  high: { label: "High confidence", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  medium: { label: "Building confidence", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  low: { label: "Early signal", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function ScoreBreakdown({ stat, view }: { stat: AiStat; view: View }) {
  // Nothing to explain before the first real vote: no demo totals sit behind it.
  if (stat.votes === 0) {
    return (
      <section className="lab-panel p-5" aria-labelledby="score-breakdown">
        <p className="eyebrow">Transparency</p>
        <h2 id="score-breakdown" className="display mt-1.5 text-lg text-ink">
          No score yet
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Nobody has rated this tool yet, so there is no score to explain. The first real rating starts it. No demo
          votes, imported averages or purchased scores sit behind any number on GigleNode.
        </p>
      </section>
    );
  }

  const breakdown = scoreBreakdown(stat, view);
  const totalWeight = breakdown.layers.reduce((sum, layer) => sum + layer.weight, 0) || 1;
  const confidence = CONFIDENCE[breakdown.confidence];

  return (
    <section className="lab-panel p-5" aria-labelledby="score-breakdown">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Transparency</p>
          <h2 id="score-breakdown" className="display mt-1.5 text-lg text-ink">
            Why this score?
          </h2>
        </div>
        <span className={`chip ring-1 ${confidence.tone}`}>{confidence.label}</span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="display text-4xl leading-none text-ink">{breakdown.final.toFixed(1)}</span>
        <span className="pb-0.5 text-xs font-medium text-muted">/ 5 from {formatVotes(stat.votes)} votes</span>
      </div>

      <div className="mt-4 space-y-3">
        {breakdown.layers.map((layer) => {
          const share = Math.round((layer.weight / totalWeight) * 100);
          return (
            <div key={layer.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">{layer.label}</span>
                <span className="tabular-nums text-muted">
                  {layer.value.toFixed(2)} ★ · {share}% of score
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#4f46e5,#7c3aed,#0891b2)]"
                  style={{ width: `${Math.max(4, share)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">{layer.detail}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-line/70 pt-3 text-[11px] leading-relaxed text-muted">{breakdown.formula}</p>
      <Link href="/ranking#method" className="mt-2 inline-flex text-xs font-semibold text-brand hover:text-brand-dark">
        Read the full method →
      </Link>
    </section>
  );
}
