import { RATING_CRITERIA, readCriteria } from "@/lib/criteria";
import type { Rating } from "@/lib/types";

/** The structured part of a review: five area scores plus pros/cons. */
export default function ReviewDetail({ rating }: { rating: Rating }) {
  const criteria = readCriteria(rating.criteria);
  return (
    <>
      {criteria ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RATING_CRITERIA.map(({ key, label }) => (
            <span key={key} className="chip border border-line bg-slate-50 text-[10px] text-slate-600">
              {label} <strong className="ml-0.5 text-ink">{criteria[key]}</strong>
            </span>
          ))}
        </div>
      ) : null}
      {rating.pros ? (
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-700">
          <span className="font-semibold">What worked:</span> {rating.pros}
        </p>
      ) : null}
      {rating.cons ? (
        <p className="mt-0.5 text-xs leading-relaxed text-rose-600">
          <span className="font-semibold">What did not:</span> {rating.cons}
        </p>
      ) : null}
    </>
  );
}
