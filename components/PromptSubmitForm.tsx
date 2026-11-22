"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitPromptAction, type ActionState } from "@/app/actions";

/**
 * Only rendered for signed-in users; the action re-checks the session server-side.
 * Pass `ais` to render an AI picker (library page); otherwise `aiId` is fixed.
 */
export default function PromptSubmitForm({
  aiId,
  aiName,
  ais,
}: {
  aiId?: string;
  aiName?: string;
  ais?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitPromptAction, { ok: false });
  const router = useRouter();
  const options = ais?.length ? ais : null;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <details className="mt-3 border-t border-line pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        + Add your own prompt{options ? "" : ` for ${aiName ?? "this AI"}`}
      </summary>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Free to add and free to use. Prompts from the GigleNode team get a verified tick.
      </p>
      <form action={formAction} className="mt-2 space-y-2">
        {options ? (
          <div>
            <label className="label" htmlFor="prompt-ai">
              AI tool
            </label>
            <select id="prompt-ai" name="aiId" defaultValue={aiId ?? options[0].id} className="field !py-2 text-sm">
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="aiId" value={aiId} />
        )}
        <div>
          <label className="label" htmlFor={`prompt-title-${aiId ?? "library"}`}>
            Title
          </label>
          <input
            id={`prompt-title-${aiId ?? "library"}`}
            name="title"
            required
            minLength={3}
            maxLength={80}
            className="field !py-2 text-sm"
            placeholder="e.g. Turn a blog post into a LinkedIn carousel"
          />
        </div>
        <div>
          <label className="label" htmlFor={`prompt-text-${aiId ?? "library"}`}>
            Prompt
          </label>
          <textarea
            id={`prompt-text-${aiId ?? "library"}`}
            name="promptText"
            required
            minLength={15}
            maxLength={2000}
            rows={4}
            className="field resize-none !py-2 text-sm"
            placeholder="The exact prompt you paste into the AI tool…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={pending} className="btn btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50">
            {pending ? "Adding…" : "Add prompt"}
          </button>
          <span className="text-[11px] text-muted">Your name appears as the contributor.</span>
        </div>
        {state.error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{state.error}</p>
        ) : null}
        {state.ok && state.message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.message}</p>
        ) : null}
      </form>
    </details>
  );
}
