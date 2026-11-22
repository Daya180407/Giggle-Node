"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  claimListingAction,
  replyToReviewAction,
  subscribeNewsletterAction,
  submitToolAction,
  type ActionState,
  type NewsletterState,
} from "@/app/actions";

function ErrorLine({ state }: { state: ActionState }) {
  if (state.error) {
    return <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{state.error}</p>;
  }
  if (state.ok && state.message) {
    return <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.message}</p>;
  }
  return null;
}

/** Public "suggest a tool" form — the entry point of the moderation queue. */
export function SubmitToolForm({
  categories,
  defaultEmail = "",
}: {
  categories: { slug: string; name: string; emoji: string }[];
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitToolAction, { ok: false });

  if (state.ok && state.message) {
    return (
      <div className="card p-5">
        <p className="text-2xl" aria-hidden>
          ✅
        </p>
        <h2 className="display mt-1 text-lg text-ink">Submission received</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{state.message}</p>
        <a href="/submit" className="btn btn-ghost mt-3 text-xs">
          Submit another tool
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <div>
        <label className="label" htmlFor="sub-name">
          Tool name
        </label>
        <input id="sub-name" name="name" required minLength={2} maxLength={80} className="field" placeholder="e.g. Runway" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sub-website">
            Website
          </label>
          <input id="sub-website" name="website" required className="field" placeholder="runwayml.com" />
        </div>
        <div>
          <label className="label" htmlFor="sub-category">
            Category
          </label>
          <select id="sub-category" name="category" className="field" defaultValue={categories[0]?.slug ?? ""}>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.emoji} {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sub-price-type">
            Pricing model
          </label>
          <select id="sub-price-type" name="priceType" className="field" defaultValue="freemium">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sub-price">
            Starting price (USD / month)
          </label>
          <input id="sub-price" name="planPrice" type="number" min={0} max={10000} step="0.01" className="field" placeholder="0" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="sub-description">
          What does it do?
        </label>
        <textarea
          id="sub-description"
          name="description"
          required
          minLength={20}
          maxLength={900}
          rows={4}
          className="field resize-none"
          placeholder="A short, honest description — who it is for and what it does well."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sub-person">
            Your name
          </label>
          <input id="sub-person" name="submitterName" maxLength={80} className="field" placeholder="Optional" />
        </div>
        <div>
          <label className="label" htmlFor="sub-email">
            Your email
          </label>
          <input
            id="sub-email"
            name="submitterEmail"
            type="email"
            required
            defaultValue={defaultEmail}
            className="field"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Every suggestion is reviewed by an editor before it appears. We check pricing, the official website and whether
        the tool is actually useful — this is why the rankings stay trustworthy.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="btn btn-primary disabled:opacity-50">
          {pending ? "Sending…" : "Submit for review"}
        </button>
        <span className="text-[11px] text-muted">Free, no account needed.</span>
      </div>
      <ErrorLine state={state} />
    </form>
  );
}

/** Footer newsletter capture with the double opt-in confirmation link. */
export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletterAction, { ok: false });

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
        />
        <button
          disabled={pending}
          className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-3.5 py-2 text-sm font-semibold text-[#07070d] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Subscribe"}
        </button>
      </div>
      {state.error ? <p className="mt-2 text-xs text-rose-400">{state.error}</p> : null}
      {state.ok && state.message ? (
        <div className="mt-2 text-xs text-emerald-300">
          <p>{state.message}</p>
          {state.confirmUrl ? (
            <a href={state.confirmUrl} className="mt-1 inline-block font-semibold text-indigo-300 underline">
              Confirm subscription now →
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

/** Vendor claim form shown at the bottom of an unclaimed listing. */
export function ClaimListingForm({ aiId, aiName }: { aiId: string; aiName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(claimListingAction, { ok: false });

  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Own {aiName}? Claim this listing
      </summary>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        A verified claim lets you reply to reviews and fix wrong pricing or feature details.
      </p>
      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="aiId" value={aiId} />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`claim-name-${aiId}`}>
              Name / company
            </label>
            <input id={`claim-name-${aiId}`} name="vendorName" required minLength={2} maxLength={80} className="field !py-2 text-sm" />
          </div>
          <div>
            <label className="label" htmlFor={`claim-email-${aiId}`}>
              Work email
            </label>
            <input
              id={`claim-email-${aiId}`}
              name="email"
              type="email"
              required
              className="field !py-2 text-sm"
              placeholder={`team@${aiName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}
            />
          </div>
        </div>
        <textarea
          name="message"
          rows={2}
          maxLength={500}
          className="field resize-none !py-2 text-xs"
          placeholder="Anything we should know? Link to your team page helps us verify."
        />
        <button disabled={pending} className="btn btn-ghost !px-2.5 !py-1 text-xs disabled:opacity-50">
          {pending ? "Sending…" : "Request claim"}
        </button>
        <ErrorLine state={state} />
      </form>
    </details>
  );
}

/** Vendor / moderator reply box under a review. */
export function ReviewReplyForm({ ratingId }: { ratingId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(replyToReviewAction, { ok: false });
  const router = useRouter();

  // Pull the fresh review list so the new reply appears immediately.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  if (state.ok && state.message) {
    return <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">{state.message}</p>;
  }

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[11px] font-semibold text-brand">Reply as the vendor</summary>
      <form action={formAction} className="mt-1.5 space-y-1.5">
        <input type="hidden" name="ratingId" value={ratingId} />
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={600}
          rows={2}
          className="field resize-none !py-2 text-xs"
          placeholder="Answer publicly — what changed, or what the reviewer may have missed."
        />
        <button disabled={pending} className="btn btn-ghost !px-2.5 !py-1 text-[11px] disabled:opacity-50">
          {pending ? "Posting…" : "Post reply"}
        </button>
        {state.error ? <p className="text-[11px] text-rose-600">{state.error}</p> : null}
      </form>
    </details>
  );
}
