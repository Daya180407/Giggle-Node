import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAppPricingAction } from "@/app/actions";
import AiLogo from "@/components/AiLogo";
import PlanFields from "@/components/admin/PlanFields";
import { appPricingFor, formatPlanPrice } from "@/lib/plans";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { APP_ENTRIES } from "@/lib/software";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAppPricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { slug } = await params;
  const { saved } = await searchParams;
  const entry = APP_ENTRIES.find((row) => row.slug === slug);
  if (!entry) notFound();

  const db = readDb();
  const settings = getSiteSettings(db);
  const ai = entry.aiSlug ? db.ai.find((row) => row.slug === entry.aiSlug) : undefined;
  const savedPricing = db.appPricing?.[slug];
  const effective = appPricingFor(db, entry, ai);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <AiLogo
            src={entry.aiSlug ? `/logos/${entry.aiSlug}.png` : `/app-icons/${entry.slug}.png`}
            logo={entry.emoji}
            color={entry.color}
            size={44}
            rounded="rounded-xl"
          />
          <div>
            <h2 className="text-lg font-bold">{entry.name}</h2>
            <p className="text-xs text-muted">
              {entry.kind === "mobile" ? "Mobile app" : "PC software"} · {entry.platforms.join(", ")} ·{" "}
              {entry.note}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/apps" className="btn btn-ghost text-xs">
            ← All apps
          </Link>
          <Link href="/#apps" className="btn btn-ghost text-xs">
            Public listing →
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Saved. Plans and pricing now show on the public app listing.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-4">
          <h3 className="text-sm font-bold">Plans &amp; pricing</h3>
          <p className="mt-1 text-xs text-muted">
            Add app-specific plans here. If left empty, the linked AI's plans are used.
          </p>
          <form action={saveAppPricingAction} className="mt-3 space-y-3">
            <input type="hidden" name="slug" value={entry.slug} />
            <PlanFields
              plans={savedPricing?.plans ?? []}
              hint={
                ai
                  ? `Fallback: ${ai.plans?.length ?? 0} plans from ${ai.name} will be used on the public AI page.`
                  : "This app has no linked AI, so its plans must be added here."
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="apiFrom">
                  API / model price line
                </label>
                <input
                  id="apiFrom"
                  name="apiFrom"
                  defaultValue={savedPricing?.apiFrom ?? ""}
                  placeholder={ai ? effective.apiFrom : "From $2.50 / 1M tokens"}
                  className="field"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Shown for PC software and API apps. Empty = auto rate from models.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="apiNote">
                  Pricing note
                </label>
                <input
                  id="apiNote"
                  name="apiNote"
                  defaultValue={savedPricing?.apiNote ?? ""}
                  placeholder="e.g. Credits billed separately"
                  className="field"
                />
              </div>
            </div>
            <button className="btn btn-primary !py-2 text-xs">Save plans &amp; pricing</button>
          </form>
        </section>

        <aside className="space-y-3">
          <section className="card p-4">
            <h3 className="text-sm font-bold">Public preview</h3>
            {effective.plans.length ? (
              <ul className="mt-2 space-y-1.5">
                {effective.plans.map((plan) => (
                  <li key={plan.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">{plan.name}</span>
                    <span className="text-muted">{formatPlanPrice(plan, settings.appearance)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">No plans yet — the listing shows only the price badge.</p>
            )}
            {effective.apiFrom ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">{effective.apiFrom}</p>
            ) : null}
          </section>

          {ai ? (
            <section className="card p-4">
              <h3 className="text-sm font-bold">Linked AI</h3>
              <Link href={`/admin/ai/${ai.slug}`} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
                Edit {ai.name} plans &amp; models →
              </Link>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Model-level API pricing and best-for are controlled there.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
