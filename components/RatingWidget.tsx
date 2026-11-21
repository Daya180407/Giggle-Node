"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { rateModelAction, type ActionState } from "@/app/actions";
import { Stars } from "@/components/ui";
import { timeAgo } from "@/lib/rank";
import type { Rating } from "@/lib/types";

const LABELS = ["", "Bilkul nahi", "Thoda", "Theek", "Achha", "Zabardast"];

export default function RatingWidget({
  modelId,
  existing,
  isLoggedIn,
  loginNext,
}: {
  modelId: string;
  existing: Rating | null;
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(rateModelAction, { ok: false });
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
    if (state.ok) setEditing(false);
  }, [state.ok]);

  useEffect(() => {
    if (!existing?.lastEditedAt || mountTime === null) return;
    const elapsed = mountTime - new Date(existing.lastEditedAt).getTime();
    setLocked(elapsed < 24 * 60 * 60 * 1000);
  }, [existing?.lastEditedAt, mountTime]);

  if (!isLoggedIn) {
    return (
      <div className="card p-5">
        <h3 className="text-base font-bold">Is Model Ko Rate Kijiye</h3>
        <p className="mt-1 text-sm text-muted">
          Rating dene ke liye login karna zaroori hai. Ek user ek model ko ek hi baar rate kar sakta hai.
        </p>
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="btn btn-primary mt-3">
          Login karke rate kijiye
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">Is Model Ko Rate Kijiye</h3>
          <p className="mt-1 text-xs text-muted">Aapka review 600 characters tak ho sakta hai. Ek user, ek rating.</p>
        </div>
        {existing && !editing ? (
          <span className="chip bg-indigo-50 text-indigo-700">Aapne {existing.stars} ★ diya hai</span>
        ) : null}
      </div>

      {existing && !editing ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Stars value={existing.stars} size={18} />
            <span className="text-sm font-semibold">{existing.stars}.0 / 5</span>
          </div>
          {existing.review ? <p className="mt-2 text-sm text-slate-600">“{existing.review}”</p> : null}
          <p className="mt-2 text-xs text-muted">
            Last updated: {timeAgo(existing.lastEditedAt ?? existing.updatedAt)}
          </p>
          {locked ? (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              24 ghante me ek hi baar edit allowed hai. Thodi der baad try kijiye.
            </p>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost mt-3">
              ✏️ Edit Rating
            </button>
          )}
        </div>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="modelId" value={modelId} />
          <input type="hidden" name="stars" value={stars} />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setStars(n)}
                  className={`text-2xl leading-none transition ${
                    (hover || stars) >= n ? "text-star" : "text-slate-300"
                  } hover:scale-110`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm text-muted">{LABELS[hover || stars] || "Star chuniye"}</span>
          </div>

          <textarea
            name="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Chhota review likhiye (optional) — kis kaam me fayda hua?"
            className="field resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending || stars === 0} className="btn btn-primary disabled:opacity-50">
              {pending ? "Saving…" : existing ? "Update Rating" : "Submit Rating"}
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
            {existing ? (
              <span className="text-xs text-muted">Edit karne par purani rating update hogi.</span>
            ) : null}
          </div>

          {state.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
          ) : null}
          {state.ok && state.message ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
