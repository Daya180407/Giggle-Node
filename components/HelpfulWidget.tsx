"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markHelpfulAction, type ActionState } from "@/app/actions";
import { formatVotes } from "@/lib/format";

/**
 * Quick "was this helpful?" signal. No account is needed: it is a light
 * community hint next to the login-gated star rating, and it never changes
 * the ranking score.
 */
export default function HelpfulWidget({
  aiId,
  modelId = null,
  useful,
  notUseful,
  myVote,
  label,
}: {
  aiId: string;
  modelId?: string | null;
  useful: number;
  notUseful: number;
  myVote: "yes" | "no" | null;
  /** What the visitor is judging, e.g. "ChatGPT" or "GPT-5". */
  label: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(markHelpfulAction, { ok: false });
  const router = useRouter();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(myVote);
  const total = useful + notUseful;
  const percent = total ? Math.round((useful / total) * 100) : 0;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <section className="card p-4" aria-labelledby="helpful-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Was this helpful?</p>
          <h2 id="helpful-heading" className="display mt-1 text-base text-ink">
            Did this page help you judge {label}?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {total > 0 ? (
              <>
                <span className="font-semibold text-ink">
                  {formatVotes(useful)} {useful === 1 ? "person" : "people"}
                </span>{" "}
                found this listing useful ({percent}% of {formatVotes(total)} {total === 1 ? "vote" : "votes"}).
                Anonymous — no account needed.
              </>
            ) : (
              <>No votes yet. Be the first to say whether this listing was useful — no account needed.</>
            )}
          </p>
        </div>

        <form action={formAction} className="flex shrink-0 flex-wrap items-center gap-2">
          <input type="hidden" name="aiId" value={aiId} />
          <input type="hidden" name="modelId" value={modelId ?? ""} />
          <button
            type="submit"
            name="answer"
            value="yes"
            onClick={() => setAnswer("yes")}
            aria-pressed={answer === "yes"}
            disabled={pending}
            className={`btn !py-1.5 text-xs disabled:opacity-50 ${
              answer === "yes" ? "border border-indigo-200 bg-brand-soft text-brand" : "btn-ghost"
            }`}
          >
            👍 Yes, useful
          </button>
          <button
            type="submit"
            name="answer"
            value="no"
            onClick={() => setAnswer("no")}
            aria-pressed={answer === "no"}
            disabled={pending}
            className={`btn !py-1.5 text-xs disabled:opacity-50 ${
              answer === "no" ? "border border-indigo-200 bg-brand-soft text-brand" : "btn-ghost"
            }`}
          >
            👎 Not really
          </button>
        </form>
      </div>

      {state.ok ? (
        <p className="mt-2 text-xs text-emerald-700">
          {state.message} {answer ? "You can change your answer anytime." : ""}
        </p>
      ) : null}
      {state.error ? <p className="mt-2 text-xs text-rose-600">{state.error}</p> : null}
    </section>
  );
}
