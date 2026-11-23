"use client";

import { useActionState } from "react";
import { submitOwnerClaimAction } from "@/app/owner-actions";
import type { OwnerFormState } from "@/lib/owner-forms";

const INITIAL: OwnerFormState = { ok: false };

type AiOption = { id: string; name: string; domains: string[] };

export default function OwnerClaimForm({ ais }: { ais: AiOption[] }) {
  const [state, formAction, pending] = useActionState<OwnerFormState, FormData>(submitOwnerClaimAction, INITIAL);

  return (
    <div className="space-y-4">
      <form action={formAction} className="card space-y-3 p-5">
        <div>
          <h1 className="display text-2xl text-ink">Claim your AI listing</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Ownership is separate from the public vendor claim: after verification you get a login that can edit your
            own listing&apos;s plans, pricing, models and posts. The site team creates that login only after a mail from
            your company domain.
          </p>
        </div>

        {state.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {state.error}
          </p>
        ) : null}

        <label className="block text-xs font-semibold text-slate-600">
          Listing
          <select name="aiId" required className="field mt-1 w-full" defaultValue="">
            <option value="" disabled>
              Choose your AI
            </option>
            {ais.map((ai) => (
              <option key={ai.id} value={ai.id}>
                {ai.name}
                {ai.domains.length ? ` · ${ai.domains.join(", ")}` : " · domain not on file"}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Your name
            <input name="applicantName" required maxLength={80} className="field mt-1 w-full" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Company
            <input name="company" maxLength={80} className="field mt-1 w-full" />
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          Work email
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            className="field mt-1 w-full"
            placeholder="you@yourcompany.com"
          />
          <span className="mt-1 block text-[10.5px] font-normal text-muted">
            Must be on the listing&apos;s official domain. Free mailboxes (gmail, outlook, …) cannot be verified.
          </span>
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          Anything we should know
          <textarea name="message" rows={3} maxLength={500} className="field mt-1 w-full" />
        </label>

        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Sending…" : "Request ownership"}
        </button>
      </form>

      {state.ok && state.code ? (
        <div className="card space-y-2 border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-sm font-bold text-emerald-900">{state.message}</p>
          <p className="text-xs leading-relaxed text-emerald-900/80">
            Send an email <strong>from {state.domain ? `*@${state.domain}` : "your company address"}</strong> to{" "}
            <strong>{state.inbox}</strong> with this code in the subject or body:
          </p>
          <p className="select-all rounded-xl border border-emerald-300 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.18em] text-emerald-800">
            {state.code}
          </p>
          <p className="text-[11px] leading-relaxed text-emerald-900/70">
            The reverse direction never works: the code must arrive from your company domain. Once the site team checks
            the inbox they will create your login and share the credentials.
          </p>
        </div>
      ) : null}
    </div>
  );
}
