"use client";

import { useActionState } from "react";
import { magicLinkAction, type AuthState } from "@/app/auth-actions";

export default function MagicLinkForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(magicLinkAction, { ok: false });

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="next" value={next} />
      <label className="label" htmlFor="magic-email">
        Email me a one-time login link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          className="field sm:flex-1"
        />
        <button className="btn btn-ghost shrink-0 text-xs" disabled={pending}>
          {pending ? "Sending…" : "Send login link"}
        </button>
      </div>
      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{state.error}</p> : null}
      {state.ok && state.message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-700">{state.message}</p>
      ) : null}
      {state.magicLink ? (
        <a href={state.magicLink} className="block break-all text-xs font-semibold text-brand hover:underline">
          Open your login link (shown because email delivery is not configured)
        </a>
      ) : null}
    </form>
  );
}
