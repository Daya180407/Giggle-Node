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
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</div>
          {state.resetLink ? (
            <>
              <p className="text-xs text-muted">
                Email service (Resend) abhi configured nahi hai, isliye demo mode me reset link yahan dikh raha hai.
              </p>
              <Link href={state.resetLink} className="btn btn-primary w-full">
                Reset link kholiye
              </Link>
            </>
          ) : null}
          <Link href="/login" className="block text-center text-xs text-brand hover:underline">
            ← Login page
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
              placeholder="aapka@email.com"
              className="field"
            />
          </div>
          {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Bhej rahe hain…" : "Reset link bhejiye"}
          </button>
          <Link href="/login" className="block text-center text-xs text-brand hover:underline">
            ← Login page
          </Link>
        </form>
      )}
    </div>
  );
}
