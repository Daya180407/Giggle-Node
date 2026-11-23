"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { rateModelAction, type ActionState } from "@/app/actions";
import { Stars } from "@/components/ui";
import { RATING_CRITERIA } from "@/lib/criteria";
import { timeAgo } from "@/lib/rank";
import type { Rating, RatingCriteria, RatingCriterion } from "@/lib/types";

const LABELS = ["", "Not for me", "Could be better", "Decent", "Good", "Excellent"];

type Scores = Record<RatingCriterion, number>;

const EMPTY_SCORES: Scores = { ease: 0, quality: 0, speed: 0, reliability: 0, value: 0 };

function normalizeScores(criteria: RatingCriteria | null | undefined): Scores {
  if (!criteria) return { ...EMPTY_SCORES };
  return {
    ease: criteria.ease ?? 0,
    quality: criteria.quality ?? 0,
    speed: criteria.speed ?? 0,
    reliability: criteria.reliability ?? 0,
    value: criteria.value ?? 0,
  };
}

export default function RatingWidget({
  modelId,
  aiId,
  title,
  existing,
  isLoggedIn,
  loginNext,
  embedded = false,
}: {
  /** Model being rated. Omit when `aiId` is set. */
  modelId?: string | null;
  /** Set to rate the AI overall instead of a single model. */
  aiId?: string | null;
  /** Heading override, e.g. "Rate ChatGPT overall". */
  title?: string;
  existing: Rating | null;
  isLoggedIn: boolean;
  loginNext: string;
  /** Render without the outer card when placed inside another panel. */
  embedded?: boolean;
}) {
  const overall = Boolean(aiId);
  const heading = title ?? (overall ? "Rate this AI overall" : "Rate this model");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(rateModelAction, { ok: false });
  const router = useRouter();
  const [scores, setScores] = useState<Scores>(() => normalizeScores(existing?.criteria));
  const [review, setReview] = useState(existing?.review ?? "");
  const [pros, setPros] = useState(existing?.pros ?? "");
  const [cons, setCons] = useState(existing?.cons ?? "");
  const [editing, setEditing] = useState(!existing);
  const [locked, setLocked] = useState(false);
  const [mountTime, setMountTime] = useState<number | null>(null);

  useEffect(() => {
    setMountTime(Date.now());
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    setEditing(false);
    // Pull the saved rating back from the server so the summary is not stale.
    router.refresh();
  }, [state, router]);

  useEffect(() => {
    if (!existing?.lastEditedAt || mountTime === null) return;
    const elapsed = mountTime - new Date(existing.lastEditedAt).getTime();
    setLocked(elapsed < 24 * 60 * 60 * 1000);
  }, [existing?.lastEditedAt, mountTime]);

  const shellClass = embedded ? "" : "card p-5";
  const complete = RATING_CRITERIA.every(({ key }) => scores[key] >= 1);
  const finalStars = complete
    ? Math.round((RATING_CRITERIA.reduce((sum, { key }) => sum + scores[key], 0) / RATING_CRITERIA.length) * 10) / 10
    : 0;

  if (!isLoggedIn) {
    return (
      <div className={shellClass}>
        <h3 className="display text-base text-ink">{heading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          You need an account to rate. One verified user, one rating per {overall ? "AI" : "model"}.
        </p>
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="btn btn-primary mt-3">
          Log in to rate
        </Link>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="display text-base text-ink">{heading}</h3>
          <p className="mt-1 text-xs text-muted">
            Score five areas from 1 to 5. Your overall stars are their average. One rating per user.
          </p>
        </div>
        {existing && !editing ? <span className="chip chip-brand">You rated {existing.stars.toFixed(1)} ★</span> : null}
      </div>

      {existing && !editing ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Stars value={existing.stars} size={22} />
            <span className="text-sm font-semibold text-ink">{existing.stars.toFixed(1)} / 5</span>
          </div>
          {existing.criteria ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RATING_CRITERIA.map(({ key, label }) => (
                <span key={key} className="chip border border-line bg-slate-50 text-[10px] text-slate-600">
                  {label} <strong className="ml-0.5 text-ink">{existing.criteria?.[key]}</strong>
                </span>
              ))}
            </div>
          ) : null}
          {existing.pros ? (
            <p className="mt-2 text-xs leading-relaxed text-emerald-700">
              <span className="font-semibold">What worked:</span> {existing.pros}
            </p>
          ) : null}
          {existing.cons ? (
            <p className="mt-0.5 text-xs leading-relaxed text-rose-600">
              <span className="font-semibold">What did not:</span> {existing.cons}
            </p>
          ) : null}
          {existing.review ? <p className="mt-2 text-sm leading-relaxed text-slate-600">“{existing.review}”</p> : null}
          <p className="mt-2 text-xs text-muted">Last updated {timeAgo(existing.lastEditedAt ?? existing.updatedAt)}</p>
          {locked ? (
            <p className="mt-2 border-l-2 border-line pl-3 text-xs text-slate-500">
              You can edit once every 24 hours. Please try again later.
            </p>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost mt-3">
              Edit rating
            </button>
          )}
        </div>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          {overall ? (
            <input type="hidden" name="aiId" value={aiId ?? ""} />
          ) : (
            <input type="hidden" name="modelId" value={modelId ?? ""} />
          )}

          <div className="space-y-2 rounded-xl border border-line p-3">
            {RATING_CRITERIA.map(({ key, label, hint }) => (
              <div key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="w-32 text-xs font-semibold text-ink">{label}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${label}: ${n} of 5`}
                      aria-pressed={scores[key] === n}
                      onClick={() => setScores((prev) => ({ ...prev, [key]: n }))}
                      className={`text-xl leading-none transition ${
                        scores[key] >= n ? "text-star" : "text-slate-300"
                      } hover:scale-110`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted">
                  {scores[key] ? `${scores[key]}/5 · ${LABELS[scores[key]]}` : hint}
                </span>
                <input type="hidden" name={`criterion_${key}`} value={scores[key] || ""} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Final score (average)</p>
              <p className="text-sm font-semibold text-ink">
                {complete ? `${finalStars.toFixed(1)} / 5` : "Rate all five areas"}
              </p>
            </div>
            {complete ? <Stars value={finalStars} size={17} /> : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="pros"
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              maxLength={160}
              placeholder="What worked well? (optional)"
              className="field text-sm"
            />
            <input
              name="cons"
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              maxLength={160}
              placeholder="What did not work? (optional)"
              className="field text-sm"
            />
          </div>

          <textarea
            name="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Add a short review (optional) — what did it help you with?"
            className="field resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending || !complete}
              className="btn btn-primary disabled:opacity-50"
              title={complete ? undefined : "Score all five areas first"}
            >
              {pending ? "Saving…" : existing ? "Update rating" : "Submit rating"}
            </button>
            {existing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setScores(normalizeScores(existing.criteria));
                  setReview(existing.review ?? "");
                  setPros(existing.pros ?? "");
                  setCons(existing.cons ?? "");
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            ) : null}
            {existing ? <span className="text-xs text-muted">Editing updates your existing rating.</span> : null}
          </div>
        </form>
      )}

      {state.error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="mt-3 border-l-2 border-emerald-300 pl-3 text-sm text-emerald-700">{state.message}</p>
      ) : null}
    </div>
  );
}
