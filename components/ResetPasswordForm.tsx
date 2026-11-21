"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/app/auth-actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(resetPasswordAction, { ok: false });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="reset-password">
          Naya password (kam se kam 8 characters)
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="reset-confirm">
          Naya password dobara
        </label>
        <input
          id="reset-confirm"
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
        {pending ? "Password update ho raha hai…" : "Password update kijiye"}
      </button>

      <Link href="/login" className="block text-center text-xs text-brand hover:underline">
        ← Login page
      </Link>
    </form>
  );
}
