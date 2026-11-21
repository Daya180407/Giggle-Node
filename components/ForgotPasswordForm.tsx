"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type AuthState } from "@/app/auth-actions";

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(forgotPasswordAction, { ok: false });

  return (
    <div>
      {state.ok ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</div>
          {state.resetLink ? (
            <>
              <p className="text-xs leading-relaxed text-muted">
                Email delivery is not configured in this demo, so the reset link is shown here instead.
              </p>
              <Link href={state.resetLink} className="btn btn-primary w-full">
                Open reset link
              </Link>
            </>
          ) : null}
          <Link href="/login" className="block text-center text-xs text-brand hover:underline">
            ← Back to login
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="label" htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              className="field"
            />
          </div>
          {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/login" className="block text-center text-xs text-brand hover:underline">
            ← Back to login
          </Link>
        </form>
      )}
    </div>
  );
}
