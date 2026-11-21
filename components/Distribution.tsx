import { distribution } from "@/lib/rank";

export default function Distribution({ dist, votes }: { dist: number[]; votes: number }) {
  const rows = distribution(dist);
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-bold">Rating Distribution</h3>
        <span className="text-xs text-muted">{votes.toLocaleString("en-IN")} votes</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.stars} className="flex items-center gap-2 text-xs">
            <span className="w-8 shrink-0 text-slate-500">{row.stars} ★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-star"
                style={{ width: `${Math.max(row.percent, row.count > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-medium text-slate-600">{row.percent}%</span>
            <span className="hidden w-10 shrink-0 text-right text-muted sm:block">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
