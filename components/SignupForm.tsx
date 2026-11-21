"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type AuthState } from "@/app/auth-actions";

export default function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signupAction, { ok: false });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="signup-name">
          Naam
        </label>
        <input id="signup-name" name="name" required autoComplete="name" placeholder="Aapka naam" className="field" />
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
          placeholder="aapka@email.com"
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="signup-password">
          Password (kam se kam 8 characters)
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
          Password dobara
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
        {pending ? "Account ban raha hai…" : "Sign up"}
      </button>

      <p className="text-center text-xs text-muted">
        Pehle se account hai?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Login kijiye
        </Link>
      </p>
    </form>
  );
}
