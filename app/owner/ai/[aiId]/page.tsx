import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  saveOwnerModelAction,
  saveOwnerPlansAction,
  saveOwnerPriceAction,
} from "@/app/owner-actions";
import { getCurrentOwner } from "@/lib/owner-auth";
import { ownsAi, priceChangeWindow, priceWaitHours, verifiedOwnerFor } from "@/lib/owners";
import { refreshDb } from "@/lib/store";
import type { Model } from "@/lib/types";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  plans: "Plans saved. The change is in your audit trail.",
  price: "Starting price saved.",
  model: "Model saved.",
};

const ERRORS: Record<string, string> = {
  plans: "Add at least one plan with a name.",
  "plan-delete": "Only the site team can remove a plan. Rename it or ask support instead.",
  source: "Add the pricing page link (https://…) so the change can be verified.",
  "price-window": "You can change a price only once every 24 hours. Please try again later.",
  model: "That model could not be saved. Check the name and try again.",
};

function ModelFields({ aiId, model }: { aiId: string; model?: Model }) {
  return (
    <form action={saveOwnerModelAction} className="space-y-2">
      <input type="hidden" name="aiId" value={aiId} />
      {model ? <input type="hidden" name="id" value={model.id} /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Model name
          <input name="name" required defaultValue={model?.name ?? ""} maxLength={80} className="field mt-1 w-full" />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Price type
          <select name="priceType" defaultValue={model?.priceType ?? "freemium"} className="field mt-1 w-full">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </label>
      </div>
      <label className="block text-[11px] font-semibold text-slate-600">
        Description
        <textarea name="description" rows={2} maxLength={600} defaultValue={model?.description ?? ""} className="field mt-1 w-full" />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        Best for
        <input name="bestFor" maxLength={200} defaultValue={model?.bestFor ?? ""} className="field mt-1 w-full" />
      </label>

      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
        <input
          type="checkbox"
          name="pricingCustom"
          defaultChecked={Boolean(model?.pricing)}
          className="h-3.5 w-3.5 accent-indigo-600"
        />
        Set API pricing for this model
      </label>
      <div className="grid gap-2 rounded-xl border border-line/70 bg-slate-50/60 p-2.5 sm:grid-cols-3">
        <label className="block text-[11px] font-semibold text-slate-600">
          Input / unit
          <input name="pricingInput" inputMode="decimal" defaultValue={model?.pricing?.input ?? ""} className="field mt-1 w-full" />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Output / unit
          <input name="pricingOutput" inputMode="decimal" defaultValue={model?.pricing?.output ?? ""} className="field mt-1 w-full" />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Unit
          <input name="pricingUnit" defaultValue={model?.pricing?.unit ?? "1M tokens"} maxLength={20} className="field mt-1 w-full" />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Context window
          <input name="pricingContext" inputMode="numeric" defaultValue={model?.pricing?.contextWindow ?? ""} className="field mt-1 w-full" />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
          Pricing page link (required when pricing is set)
          <input
            name="pricingSource"
            defaultValue={model?.pricing?.source ?? ""}
            placeholder="https://yourcompany.com/pricing"
            maxLength={300}
            className="field mt-1 w-full"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-3">
          Note
          <input name="pricingNote" defaultValue={model?.pricing?.note ?? ""} maxLength={200} className="field mt-1 w-full" />
        </label>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 sm:col-span-3">
          <input
            type="checkbox"
            name="pricingAvailable"
            defaultChecked={model?.pricing?.available ?? true}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          API is publicly available at this rate
        </label>
      </div>

      <button className="btn btn-primary !py-1.5 text-xs">{model ? "Save model" : "Add model"}</button>
    </form>
  );
}

export default async function OwnerAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ aiId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");

  const { aiId } = await params;
  const { saved, error } = await searchParams;
  const db = await refreshDb();
  const ai = db.ai.find((row) => row.id === aiId);
  if (!ai || !ownsAi(db, owner.id, aiId)) notFound();

  const models = db.models.filter((row) => row.aiId === ai.id);
  const plans = ai.plans ?? [];
  const blanks = Math.max(1, 3 - plans.length);
  const window = priceChangeWindow(db, ai.id);
  const verified = verifiedOwnerFor(db, ai.id);

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-xl text-lg"
            style={{ backgroundColor: `${ai.color}1a` }}
          >
            {ai.logo}
          </span>
          <div className="min-w-0">
            <h2 className="display text-xl text-ink">{ai.name}</h2>
            <p className="text-[11px] text-muted">
              {verified ? "✓ Verified owner" : "Owner login"} · starting price ${ai.planPrice}/mo
            </p>
          </div>
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost ml-auto !py-1.5 text-xs">
            Public page ↗
          </Link>
        </div>
        {saved && NOTICES[saved] ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {NOTICES[saved]}
            {owner.tier === "review" ? " It will go live after an admin approves it." : ""}
          </p>
        ) : null}
        {error && ERRORS[error] ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {ERRORS[error]}
            {error === "price-window" && !window.allowed
              ? ` Next change allowed in about ${priceWaitHours(window.lastAt)}h.`
              : ""}
          </p>
        ) : null}
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-bold">Starting price</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          The headline &quot;from&quot; price on your listing. One change per 24 hours, and the pricing page link is
          required — it is stored with your edit and shown in the price history.
        </p>
        <form action={saveOwnerPriceAction} className="mt-3 grid gap-2 sm:grid-cols-4">
          <input type="hidden" name="aiId" value={ai.id} />
          <label className="block text-[11px] font-semibold text-slate-600">
            USD / month
            <input name="planPrice" inputMode="decimal" defaultValue={ai.planPrice} className="field mt-1 w-full" />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            INR / month
            <input name="planPriceInr" inputMode="decimal" defaultValue={ai.planPriceInr ?? ""} className="field mt-1 w-full" />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
            Pricing page link
            <input
              name="sourceUrl"
              required
              placeholder="https://yourcompany.com/pricing"
              maxLength={300}
              className="field mt-1 w-full"
            />
          </label>
          <div className="sm:col-span-4">
            <button className="btn btn-primary !py-1.5 text-xs" disabled={!window.allowed}>
              {window.allowed ? "Save starting price" : `Locked for ${priceWaitHours(window.lastAt)}h`}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-bold">Subscription plans</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Up to 6 plans. Plan ids stay stable when you edit a name. Removing a plan is an admin action.
        </p>
        <form action={saveOwnerPlansAction} className="mt-3 space-y-2">
          <input type="hidden" name="aiId" value={ai.id} />
          {[...plans.map((plan) => ({ ...plan, blank: false })), ...Array.from({ length: blanks }, () => null)].map(
            (plan, index) => (
              <div key={plan?.id ?? `blank-${index}`} className="grid gap-2 sm:grid-cols-5">
                <input type="hidden" name="planId" value={plan?.id ?? ""} />
                <label className="block text-[11px] font-semibold text-slate-600">
                  Plan name
                  <input name="planName" defaultValue={plan?.name ?? ""} maxLength={40} className="field mt-1 w-full" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  USD / mo
                  <input name="planPrice" inputMode="decimal" defaultValue={plan?.priceMonthly ?? ""} className="field mt-1 w-full" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  INR / mo
                  <input name="planPriceInr" inputMode="decimal" defaultValue={plan?.priceInr ?? ""} className="field mt-1 w-full" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  USD / year
                  <input name="planYearly" inputMode="decimal" defaultValue={plan?.priceYearly ?? ""} className="field mt-1 w-full" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Limits / note
                  <input name="planNote" defaultValue={plan?.note ?? ""} maxLength={140} className="field mt-1 w-full" />
                </label>
              </div>
            ),
          )}
          <button className="btn btn-primary !py-1.5 text-xs">Save plans</button>
        </form>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Models &amp; API pricing</h3>
          <span className="text-[11px] text-muted">{models.length} models</span>
        </div>
        {models.map((model) => (
          <details key={model.id} className="card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              {model.name} <span className="text-[11px] font-normal text-muted">· {model.priceType}</span>
            </summary>
            <div className="mt-3">
              <ModelFields aiId={ai.id} model={model} />
            </div>
          </details>
        ))}
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">+ Add a model</summary>
          <div className="mt-3">
            <ModelFields aiId={ai.id} />
          </div>
        </details>
      </section>
    </div>
  );
}
