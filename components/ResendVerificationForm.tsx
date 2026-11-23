"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction, type AuthState } from "@/app/auth-actions";

export default function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(resendVerificationAction, { ok: false });

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="verify-email">
          Email
        </label>
        <input
          id="verify-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          className="field"
        />
      </div>

      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}
      {state.ok && state.message ? (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{state.message}</p>
          {state.verifyLink ? (
            <Link href={state.verifyLink} className="btn btn-primary mt-2 w-full !py-2 text-xs">
              Verify this account
            </Link>
          ) : null}
        </div>
      ) : null}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send a new link"}
      </button>
    </form>
  );
}
