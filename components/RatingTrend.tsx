import type { TrendPoint } from "@/lib/community";

/** Tiny inline sparkline of weekly average ratings, built from real votes. */
export default function RatingTrend({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return null;

  const width = 132;
  const height = 34;
  const values = points.map((point) => point.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.2, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = points.length > 1 ? index * step : width / 2;
    const y = height - ((point.avg - min) / span) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly rating trend">
        {points.length > 1 ? (
          <polyline
            points={coords.join(" ")}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point, index) => {
          const [x, y] = coords[index].split(",");
          return <circle key={point.start} cx={x} cy={y} r="2.2" fill="#4F46E5" />;
        })}
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Rating trend</p>
        <p className="text-[11px] font-semibold text-ink">
          {last.toFixed(2)} ★{" "}
          <span className={delta > 0.02 ? "text-emerald-600" : delta < -0.02 ? "text-rose-500" : "text-muted"}>
            {delta > 0.02 ? "▲" : delta < -0.02 ? "▼" : "–"} {Math.abs(delta).toFixed(2)}
          </span>
        </p>
        <p className="text-[10px] text-muted">
          {points.length} week{points.length === 1 ? "" : "s"} · {points[points.length - 1].count} votes this week
        </p>
      </div>
    </div>
  );
}
