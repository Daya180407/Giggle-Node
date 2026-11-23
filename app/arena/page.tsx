import Link from "next/link";
import type { Metadata } from "next";
import ArenaBoard from "@/components/ArenaBoard";
import { AiLogo, SectionHead } from "@/components/ui";
import { arenaContenders, arenaPools, arenaRecords, arenaTotal, initialRound, topArenaPicks } from "@/lib/arena";
import { categoryName } from "@/lib/categories";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blind AI Arena — Vote Without Seeing the Brand",
  description:
    "Two AI tools from the same category, no names, no scores. Pick the one you would actually use for that job, then see who won. Free community arena with a live win-rate table.",
  alternates: { canonical: "/arena" },
};

export default async function ArenaPage() {
  const db = readDb();
  const view = buildView(db);
  const contenders = arenaContenders(view);
  const pools = arenaPools(contenders);
  const records = Object.fromEntries(arenaRecords(db));
  const total = arenaTotal(db);
  const opening = initialRound(pools, records);
  const picks = topArenaPicks(db, view, 8);

  return (
    <div>
      <section className="lab-hero">
        <div className="lab-grid" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-9 sm:px-6 sm:pt-12">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="chip border border-white/15 bg-white/[0.06] text-slate-300">
                <span className="live-dot" aria-hidden /> Community signal · no account needed
              </span>
              <h1 className="display mt-4 max-w-2xl text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.04] text-white">
                Two tools. No names.
                <br />
                <span className="hero-gradient">You decide.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                Both cards come from the same category, and logos and scores stay hidden until you pick. That strips out
                brand bias and turns the ranking into a question you can actually answer: for this job, which one would
                you open?
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Community picks</p>
                <p className="display mt-1 text-2xl text-white">{total.toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Contenders</p>
                <p className="display mt-1 text-2xl text-white">{contenders.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-band bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
          <ArenaBoard pools={pools} records={records} totalVotes={total} initialRound={opening} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-7 sm:px-6">
        <section className="mt-10">
          <SectionHead
            eyebrow="Why blind"
            title="A vote that cannot be bought by a logo"
            subtitle="Pairs are drawn inside one category, and the arena stays separate from the 1–5 leaderboard: it is a preference signal, not a score rewrite."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🕶️",
                title: "Same job, hidden brand",
                body: "Both tools do the same job, so the pick is a real preference instead of a guess between two categories. The brand stays behind the curtain.",
              },
              {
                icon: "⚖️",
                title: "Matched fairly",
                body: "A round prefers two tools on the same price tier, so a free pick is not beaten by a $20 one just because of the price badge.",
              },
              {
                icon: "🔢",
                title: "Kept separate",
                body: "Arena wins never silently rewrite weighted scores. The two numbers answer different questions, so we never mix them.",
              },
              {
                icon: "🪶",
                title: "Lightweight on purpose",
                body: "One tap, no sign-up. Win rates carry a vote count so a 1–0 record is never presented as a verdict.",
              },
            ].map((card) => (
              <div key={card.title} className="lab-panel p-5">
                <span className="text-xl" aria-hidden>
                  {card.icon}
                </span>
                <h3 className="mt-2 font-bold text-ink">{card.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {picks.length ? (
          <section className="mt-10">
            <SectionHead
              eyebrow="Community favourites"
              title="What the arena has picked"
              subtitle="One leader per category, ordered by how many same-category matchups that category has. The vote count sits next to each rate so small samples stay visible."
            />
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {picks.map(({ stat, record }, i) => (
                <Link
                  key={stat.ai.id}
                  href={`/ai/${stat.ai.slug}`}
                  className="lab-panel flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200"
                >
                  <span className="w-4 text-[11px] font-bold text-slate-400">{i + 1}</span>
                  <AiLogo slug={stat.ai.slug} logo={stat.ai.logo} color={stat.ai.color} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{stat.ai.name}</p>
                    <p className="text-[11px] text-muted">
                      {categoryName(stat.ai.category)} · {record.total} {record.total === 1 ? "matchup" : "matchups"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-ink">{Math.round(record.rate * 100)}%</p>
                    <p className="text-[10px] text-muted">
                      {record.wins}W–{record.losses}L
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
