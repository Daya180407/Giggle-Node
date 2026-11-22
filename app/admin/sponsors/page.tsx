import Link from "next/link";
import { saveSponsorshipAction, setBoostAction, setSponsoredAction } from "@/app/actions";
import { AiLogo, Stars } from "@/components/ui";
import { requireAreaPage } from "@/lib/permissions";
import { buildView, rankedAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string }>;
}) {
  await requireAreaPage("sponsors");
  const { q = "", saved } = await searchParams;
  const db = readDb();
  const view = buildView(db);
  const ranked = rankedAis(view);
  const query = q.trim().toLowerCase();
  const matched = ranked.filter((s) =>
    query ? [s.ai.name, s.ai.slug, s.ai.category].join(" ").toLowerCase().includes(query) : true,
  );
  const sponsored = matched.filter((s) => s.ai.sponsored);
  const others = matched.filter((s) => !s.ai.sponsored).slice(0, 80);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Sponsors & manual boost</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Sponsored AI pe “Sponsored” label dikhta hai. Boost 0–1 ke beech hota hai aur AI page pe disclose kiya jata
            hai — isse ranking formula override nahi hoti, sirf ranking list me position badalti hai.
          </p>
        </div>
        <span className="chip bg-amber-50 text-amber-700">{db.ai.filter((a) => a.sponsored).length} sponsored</span>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Sponsorship saved.
        </div>
      ) : null}

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/sponsors">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search AI by name, slug or category…"
          className="field min-w-[200px] flex-1 !py-2 text-xs"
          aria-label="Search sponsors"
        />
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q ? (
          <Link href="/admin/sponsors" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{matched.length} matches</span>
      </form>

      {sponsored.length ? (
        <section className="card p-4">
          <h3 className="text-sm font-bold">Sponsored ({sponsored.length})</h3>
          <div className="mt-2 divide-y divide-line">
            {sponsored.map((s) => (
              <SponsorRow key={s.ai.id} stat={s} sponsored />
            ))}
          </div>
        </section>
      ) : null}

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Other AI</h3>
          <span className="text-[11px] text-muted">Showing {others.length} of {matched.length - sponsored.length}</span>
        </div>
        <div className="mt-2 divide-y divide-line">
          {others.map((s) => (
            <SponsorRow key={s.ai.id} stat={s} sponsored={false} />
          ))}
        </div>
        {others.length === 0 ? <p className="py-4 text-sm text-muted">No tools match this search.</p> : null}
      </section>
    </div>
  );
}

function SponsorRow({
  stat,
  sponsored,
}: {
  stat: ReturnType<typeof rankedAis>[number];
  sponsored: boolean;
}) {
  const { ai } = stat;
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5">
      <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={34} rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/ai/${ai.slug}`} className="truncate text-sm font-medium hover:text-brand">
          {ai.name}
        </Link>
        <div className="flex items-center gap-1.5">
          <Stars value={stat.score} size={11} />
          <span className="text-xs text-muted">
            score {stat.score.toFixed(2)} · {stat.votes} votes
          </span>
        </div>
      </div>
      <form action={setBoostAction} className="flex items-center gap-1">
        <input type="hidden" name="id" value={ai.id} />
        <input
          name="boost"
          type="number"
          step="0.01"
          min={0}
          max={1}
          defaultValue={ai.boost}
          className="field !w-20 !py-1 text-xs"
          aria-label={`Boost for ${ai.name}`}
        />
        <button className="btn btn-ghost !px-2 !py-1 text-xs">Set boost</button>
      </form>
      <form action={setSponsoredAction}>
        <input type="hidden" name="id" value={ai.id} />
        <button className={`btn !px-2 !py-1 text-xs ${sponsored ? "bg-amber-50 text-amber-700 border border-amber-200" : "btn-ghost"}`}>
          {sponsored ? "Sponsored ✓" : "Mark sponsored"}
        </button>
      </form>

      <details className="w-full">
        <summary className="cursor-pointer text-[11px] font-semibold text-brand">
          Deal details
          {ai.sponsorAmount ? ` · ₹${ai.sponsorAmount}` : ""}
          {ai.sponsorUntil ? ` · till ${ai.sponsorUntil}` : ""}
          {ai.affiliateUrl ? " · affiliate" : ""}
        </summary>
        <form action={saveSponsorshipAction} className="mt-2 flex flex-wrap items-end gap-1.5 rounded-xl border border-line bg-slate-50/70 p-2">
          <input type="hidden" name="id" value={ai.id} />
          <div>
            <label className="label !text-[10px]" htmlFor={`amount_${ai.id}`}>
              Amount paid (₹)
            </label>
            <input
              id={`amount_${ai.id}`}
              name="sponsorAmount"
              type="number"
              min={0}
              defaultValue={ai.sponsorAmount ?? ""}
              className="field !w-28 !py-1 text-xs"
            />
          </div>
          <div>
            <label className="label !text-[10px]" htmlFor={`days_${ai.id}`}>
              Days booked
            </label>
            <input
              id={`days_${ai.id}`}
              name="sponsorDays"
              type="number"
              min={0}
              className="field !w-24 !py-1 text-xs"
              placeholder="30"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="label !text-[10px]" htmlFor={`aff_${ai.id}`}>
              Affiliate URL
            </label>
            <input
              id={`aff_${ai.id}`}
              name="affiliateUrl"
              defaultValue={ai.affiliateUrl ?? ""}
              className="field !py-1 text-xs"
              placeholder="https://partner.example.com/ref=giglenode"
            />
          </div>
          <label className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-600">
            <input type="checkbox" name="sponsored" defaultChecked={ai.sponsored} className="h-3.5 w-3.5 accent-indigo-600" />
            Sponsored label
          </label>
          <label className="flex items-center gap-1.5 pb-1 text-[11px] text-slate-600">
            <input type="checkbox" name="clearEnd" className="h-3.5 w-3.5 accent-rose-600" />
            Clear end date
          </label>
          <button className="btn btn-primary !py-1 text-xs">Save deal</button>
        </form>
      </details>
    </div>
  );
}
