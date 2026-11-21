"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/auth-actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, { ok: false });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="field"
        />
      </div>

      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Logging in…" : "Login"}
      </button>

      <div className="flex items-center justify-between text-xs">
        <Link href="/forgot-password" className="text-brand hover:underline">
          Forgot password?
        </Link>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
