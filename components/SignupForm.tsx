"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type AuthState } from "@/app/auth-actions";

export default function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signupAction, { ok: false });

  // The account exists only after the magic link is opened, so signup ends here.
  if (state.ok && state.message) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-[13px] leading-relaxed">{state.message}</p>
        {state.verifyLink ? (
          <Link href={state.verifyLink} className="btn btn-primary mt-3 w-full !py-2 text-xs">
            Open the verification link
          </Link>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed text-emerald-800">
          The link works once and expires in 24 hours. Nothing is charged and you can close this tab.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="signup-name">
          Name
        </label>
        <input id="signup-name" name="name" required autoComplete="name" placeholder="Your name" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="signup-email">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="signup-password">
          Password (at least 8 characters)
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="signup-confirm">
          Confirm password
        </label>
        <input
          id="signup-confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>

      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted">
        We email a one-time verification link before the account becomes active.
      </p>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
