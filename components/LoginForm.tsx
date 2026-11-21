"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, { ok: false });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required placeholder="aapka@email.com" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="name">
          Naam (optional)
        </label>
        <input id="name" name="name" type="text" placeholder="Aapka naam" className="field" />
      </div>
      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Logging in…" : "Login / Sign up"}
      </button>
      <p className="text-center text-xs text-muted">
        Password ki zarurat nahi — email se account ban jata hai (dev mode). Production me Supabase Auth use hota hai.
      </p>
    </form>
  );
}
