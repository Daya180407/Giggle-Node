import Link from "next/link";
import { setBoostAction, setSponsoredAction } from "@/app/actions";
import { AiLogo, Stars } from "@/components/ui";
import { buildView, rankedAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminSponsorsPage() {
  const db = readDb();
  const view = buildView(db);
  const ranked = rankedAis(view);
  const sponsored = ranked.filter((s) => s.ai.sponsored);
  const others = ranked.filter((s) => !s.ai.sponsored);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Sponsored Listings & Manual Boost</h2>
        <p className="text-xs text-muted">
          Sponsored AI pe “Sponsored” label dikhta hai. Boost 0–1 ke beech hota hai aur AI page pe disclose kiya jata
          hai — isse ranking formula override nahi hoti, sirf ranking list me position badalti hai.
        </p>
      </div>

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
        <h3 className="text-sm font-bold">Saare AI</h3>
        <div className="mt-2 divide-y divide-line">
          {others.map((s) => (
            <SponsorRow key={s.ai.id} stat={s} sponsored={false} />
          ))}
        </div>
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
    </div>
  );
}
