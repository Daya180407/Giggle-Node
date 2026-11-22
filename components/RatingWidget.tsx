"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { rateModelAction, type ActionState } from "@/app/actions";
import { Stars } from "@/components/ui";
import { timeAgo } from "@/lib/rank";
import type { Rating } from "@/lib/types";

const LABELS = ["", "Not for me", "Could be better", "Decent", "Good", "Excellent"];

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
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [review, setReview] = useState(existing?.review ?? "");
  const [editing, setEditing] = useState(!existing);
  const [hover, setHover] = useState(0);
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
          <p className="mt-1 text-xs text-muted">Reviews can be up to 600 characters. One rating per user.</p>
        </div>
        {existing && !editing ? (
          <span className="chip chip-brand">You rated {existing.stars} ★</span>
        ) : null}
      </div>

      {existing && !editing ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Stars value={existing.stars} size={22} />
            <span className="text-sm font-semibold text-ink">{existing.stars}.0 / 5</span>
          </div>
          {existing.review ? <p className="mt-2 text-sm leading-relaxed text-slate-600">“{existing.review}”</p> : null}
          <p className="mt-2 text-xs text-muted">
            Last updated {timeAgo(existing.lastEditedAt ?? existing.updatedAt)}
          </p>
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
          <input type="hidden" name="stars" value={stars} />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setStars(n)}
                  className={`text-3xl leading-none transition ${
                    (hover || stars) >= n ? "text-star" : "text-slate-300"
                  } hover:scale-110`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm text-muted">{LABELS[hover || stars] || "Pick a star rating"}</span>
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
            <button type="submit" disabled={pending || stars === 0} className="btn btn-primary disabled:opacity-50">
              {pending ? "Saving…" : existing ? "Update rating" : "Submit rating"}
            </button>
            {existing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setStars(existing.stars);
                  setReview(existing.review ?? "");
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
