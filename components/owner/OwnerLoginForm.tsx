"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ownerLoginAction } from "@/app/owner-actions";
import type { OwnerFormState } from "@/lib/owner-forms";

const INITIAL: OwnerFormState = { ok: false };

export default function OwnerLoginForm() {
  const [state, formAction, pending] = useActionState<OwnerFormState, FormData>(ownerLoginAction, INITIAL);

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <div>
        <h1 className="display text-2xl text-ink">Owner sign in</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          This is the separate login the GiggleNode team creates for your AI listing. Your site account does not work
          here.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}

      <label className="block text-xs font-semibold text-slate-600">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          maxLength={32}
          className="field mt-1 w-full"
          placeholder="e.g. anthropic-team"
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field mt-1 w-full"
        />
      </label>

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[11px] leading-relaxed text-muted">
        No login yet?{" "}
        <Link href="/owner/claim" className="font-semibold text-brand hover:underline">
          Claim ownership of your listing
        </Link>{" "}
        — we verify it with a mail from your company domain.
      </p>
    </form>
  );
}
