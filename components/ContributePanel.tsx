"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitContributionAction, type ActionState } from "@/app/actions";

const TABS = [
  { key: "plan", label: "Subscription plan", hint: "Plan name, price and what it includes" },
  { key: "model", label: "AI model", hint: "A model that belongs to this tool" },
  { key: "pricing", label: "Pricing", hint: "Correct the starting price" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function StateLine({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-2 text-xs font-medium text-rose-600">{state.error}</p>;
  if (state.ok && state.message) return <p className="mt-2 text-xs font-medium text-emerald-700">{state.message}</p>;
  return null;
}

/**
 * "Add to this listing" panel on a public AI page. Signed-in users suggest a plan,
 * a model or a price fix; the row stays private until an admin approves it.
 */
export default function ContributePanel({
  aiId,
  aiSlug,
  aiName,
  signedIn,
}: {
  aiId: string;
  aiSlug: string;
  aiName: string;
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("plan");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitContributionAction, { ok: false });

  if (!signedIn) {
    return (
      <section className="card p-5" id="contribute">
        <h2 className="display text-lg text-ink">Add to this listing</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Know a plan, a model or the real pricing for {aiName}? Sign in and send it to the editors — it appears on this
          page only after an admin approves it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/login?next=/ai/${aiSlug}#contribute`} className="btn btn-primary text-xs">
            Sign in to contribute
          </Link>
          <Link href="/signup" className="btn btn-ghost text-xs">
            Create a free account
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5" id="contribute">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="display text-lg text-ink">Add to this listing</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Plans, models and pricing you send stay private until an editor approves them. Approved rows go live
            instantly — no research needed from the team.
          </p>
        </div>
        <span className="chip bg-slate-100 text-slate-600">Review required</span>
      </div>

      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`chip shrink-0 !px-3 !py-2 text-[12px] transition ${
              tab === item.key
                ? "bg-ink text-white"
                : "border border-line bg-white text-slate-600 hover:border-indigo-200 hover:text-brand"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{TABS.find((item) => item.key === tab)?.hint}</p>

      <form action={formAction} className="mt-3 space-y-3 border-t border-line pt-3">
        <input type="hidden" name="type" value={tab} />
        <input type="hidden" name="aiId" value={aiId} />

        {tab !== "pricing" ? (
          <div>
            <label className="label" htmlFor={`contrib-title-${tab}`}>
              {tab === "plan" ? "Plan name" : "Model name"}
            </label>
            <input
              id={`contrib-title-${tab}`}
              name="title"
              required
              maxLength={80}
              className="field"
              placeholder={tab === "plan" ? "e.g. Plus" : "e.g. GPT-5.2"}
            />
          </div>
        ) : null}

        {tab !== "model" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={`contrib-usd-${tab}`}>
                {tab === "pricing" ? "Current price (USD / month)" : "Price (USD / month)"}
              </label>
              <input
                id={`contrib-usd-${tab}`}
                name="priceMonthly"
                type="number"
                min={0}
                step="0.01"
                required={tab === "pricing"}
                className="field"
                placeholder="20"
              />
            </div>
            {tab === "plan" ? (
              <div>
                <label className="label" htmlFor="contrib-yearly">
                  Price (USD / year, optional)
                </label>
                <input id="contrib-yearly" name="priceYearly" type="number" min={0} step="0.01" className="field" />
              </div>
            ) : null}
            <div>
              <label className="label" htmlFor={`contrib-inr-${tab}`}>
                Price in ₹ (optional)
              </label>
              <input id={`contrib-inr-${tab}`} name="priceInr" type="number" min={0} step="1" className="field" />
            </div>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="contrib-price-type">
              Pricing model
            </label>
            <select id="contrib-price-type" name="priceType" className="field" defaultValue="freemium">
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor={`contrib-note-${tab}`}>
            {tab === "pricing" ? "What is wrong with the current price?" : "Details the editor should verify"}
          </label>
          <textarea
            id={`contrib-note-${tab}`}
            name="note"
            required
            minLength={8}
            maxLength={900}
            rows={3}
            className="field resize-none"
            placeholder={
              tab === "plan"
                ? "Limits, credits, what is included in this plan…"
                : tab === "model"
                  ? "What this model is good at, context window, release month…"
                  : "The official pricing page shows $X for the starting plan…"
            }
          />
        </div>

        <div>
          <label className="label" htmlFor={`contrib-source-${tab}`}>
            Official source URL (optional)
          </label>
          <input
            id={`contrib-source-${tab}`}
            name="sourceUrl"
            className="field"
            placeholder="https://…/pricing"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button disabled={pending} className="btn btn-primary text-xs disabled:opacity-50">
            {pending ? "Sending…" : "Send for review"}
          </button>
          <span className="text-[11px] text-muted">Only you and the editors can see it until it is approved.</span>
        </div>
        <StateLine state={state} />
      </form>
    </section>
  );
}

/** New mobile app or PC software suggestion; lands in the same admin review queue. */
export function SubmitAppForm({
  categories,
  groups,
  signedIn,
}: {
  categories: { slug: string; name: string; emoji: string }[];
  groups: { key: string; label: string; kind: "mobile" | "desktop" }[];
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitContributionAction, { ok: false });
  const [kind, setKind] = useState<"mobile" | "desktop">("mobile");

  if (!signedIn) {
    return (
      <div className="card p-5">
        <p className="text-sm text-slate-600">Sign in to add an app or PC software to the directory.</p>
        <Link href="/login?next=/submit" className="btn btn-primary mt-3 text-xs">
          Sign in
        </Link>
      </div>
    );
  }

  const tabGroups = groups.filter((group) => group.kind === kind);

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <input type="hidden" name="type" value="app" />

      <div>
        <label className="label" htmlFor="app-kind">
          Where does it run?
        </label>
        <select
          id="app-kind"
          name="appKind"
          className="field"
          value={kind}
          onChange={(event) => setKind(event.target.value === "desktop" ? "desktop" : "mobile")}
        >
          <option value="mobile">Mobile app (Android / iOS)</option>
          <option value="desktop">PC software (Windows / macOS / Linux)</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="app-name">
            Name
          </label>
          <input id="app-name" name="title" required minLength={2} maxLength={80} className="field" placeholder="e.g. Perplexity" />
        </div>
        <div>
          <label className="label" htmlFor="app-website">
            Official website
          </label>
          <input id="app-website" name="website" required className="field" placeholder="perplexity.ai" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="app-category">
            Main category
          </label>
          <select id="app-category" name="category" className="field" defaultValue={categories[0]?.slug ?? ""}>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.emoji} {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="app-group">
            Group on the apps list
          </label>
          <select id="app-group" name="group" className="field" defaultValue={tabGroups[0]?.key ?? "utility"}>
            {tabGroups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="app-price">
          Pricing model
        </label>
        <select id="app-price" name="priceType" className="field" defaultValue="freemium">
          <option value="free">Free</option>
          <option value="freemium">Freemium</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="app-note">
          What does it do?
        </label>
        <textarea
          id="app-note"
          name="note"
          required
          minLength={8}
          maxLength={900}
          rows={4}
          className="field resize-none"
          placeholder="A short, honest description — who it is for and what it does well."
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="btn btn-primary text-xs disabled:opacity-50">
          {pending ? "Sending…" : "Send for review"}
        </button>
        <span className="text-[11px] text-muted">Signed-in users only. It appears on the site after admin approval.</span>
      </div>
      <StateLine state={state} />
    </form>
  );
}
