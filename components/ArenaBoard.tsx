"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLogo, PriceBadge } from "@/components/ui";
import { roundInPool, type ArenaContender, type ArenaPool, type ArenaRecord, type ArenaRound } from "@/lib/arena";
import { categoryName } from "@/lib/categories";
import type { PriceType } from "@/lib/types";

type Props = {
  pools: ArenaPool[];
  records: Record<string, ArenaRecord>;
  totalVotes: number;
  initialRound: ArenaRound;
};

function recordFor(records: Record<string, ArenaRecord>, id: string): ArenaRecord {
  return records[id] ?? { wins: 0, losses: 0, total: 0, rate: 0 };
}

function BlindCard({
  side,
  contender,
  revealed,
  picked,
  winner,
  onPick,
}: {
  side: "A" | "B";
  contender: ArenaContender;
  revealed: boolean;
  picked: string | null;
  winner: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={Boolean(picked)}
      aria-label={revealed ? `Pick ${contender.name}` : `Pick tool ${side}`}
      className={`arena-card group relative flex h-full w-full flex-col rounded-2xl border p-4 text-left transition sm:p-5 ${
        picked
          ? winner
            ? "border-emerald-300 bg-emerald-50/60 shadow-[0_20px_50px_-30px_rgba(5,150,105,0.55)]"
            : "border-line bg-white/70 opacity-70"
          : "border-line bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_24px_60px_-34px_rgba(79,70,229,0.5)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-white">{side}</span>
        <span className="chip border border-line bg-white text-slate-500">{categoryName(contender.category)}</span>
      </div>

      {revealed ? (
        <div className="mt-4 flex items-center gap-2.5">
          <AiLogo slug={contender.slug} logo={contender.logo} color={contender.color} size={44} />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{contender.name}</p>
            <p className="text-xs text-muted">
              {contender.votes > 0 ? `★ ${contender.score.toFixed(1)}` : "Not rated"} ·{" "}
              {categoryName(contender.category)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 font-display text-lg font-extrabold text-ink">Tool {side}</p>
      )}

      <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-600">{contender.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {contender.bestFor.map((tag) => (
          <span key={tag} className="chip border border-line bg-slate-50 text-slate-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <PriceBadge price={contender.priceType as PriceType} />
        {revealed && picked ? (
          <span className={`chip ${winner ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            {winner ? "Your pick ✓" : "Runner-up"}
          </span>
        ) : (
          <span className="text-xs font-semibold text-brand opacity-0 transition group-hover:opacity-100">
            Pick this one →
          </span>
        )}
      </div>
    </button>
  );
}

export default function ArenaBoard({ pools, records, totalVotes, initialRound: opening }: Props) {
  const [round, setRound] = useState<ArenaRound>(opening);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState({ votes: 0, aWins: 0, bWins: 0 });
  const [localRecords, setLocalRecords] = useState<Record<string, ArenaRecord>>(records);
  const [tally, setTally] = useState(totalVotes);

  const pool = pools[round.pool] ?? pools[0];
  const left = pool?.contenders[round.a] ?? pool?.contenders[0];
  const right = pool?.contenders[round.b] ?? pool?.contenders[1];

  function nextPair() {
    if (pools.length === 0) return;
    // Stay in the same category: a next matchup inside this job is what the
    // visitor asked for, and the category chips are how they switch jobs.
    setRound(roundInPool(pools, round.pool, localRecords));
    setPicked(null);
  }

  function choosePool(index: number) {
    if (pools.length === 0 || index === round.pool) return;
    setRound(roundInPool(pools, index, localRecords));
    setPicked(null);
  }

  async function vote(winnerId: string) {
    if (picked || busy || !left || !right) return;
    setPicked(winnerId);
    setBusy(true);
    const isA = winnerId === left.id;
    setSession((s) => ({ votes: s.votes + 1, aWins: s.aWins + (isA ? 1 : 0), bWins: s.bWins + (isA ? 0 : 1) }));
    setLocalRecords((current) => {
      const next = { ...current };
      const winner = { ...recordFor(current, winnerId) };
      winner.wins += 1;
      winner.total += 1;
      winner.rate = winner.wins / winner.total;
      next[winnerId] = winner;
      const loserId = winnerId === left.id ? right.id : left.id;
      const loser = { ...recordFor(current, loserId) };
      loser.losses += 1;
      loser.total += 1;
      loser.rate = loser.wins / loser.total;
      next[loserId] = loser;
      return next;
    });
    setTally((n) => n + 1);
    try {
      await fetch("/api/arena", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aId: left.id, bId: right.id, winnerId }),
      });
    } catch {
      // The reveal stays useful even if the network drops; the local record is optimistic.
    } finally {
      setBusy(false);
    }
  }

  if (!pool || !left || !right) {
    return (
      <p className="text-sm text-muted">
        Not enough rated tools in one category for an arena yet. A blind pair needs two tools doing the same job.
      </p>
    );
  }

  const revealed = Boolean(picked);
  const table = pool.contenders
    .map((c) => ({ c, record: recordFor(localRecords, c.id) }))
    .filter((row) => row.record.total > 0)
    .sort((a, b) => b.record.rate - a.record.rate || b.record.total - a.record.total)
    .slice(0, 8);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="live-dot" aria-hidden />
            <span className="font-semibold text-ink">{tally.toLocaleString("en-US")}</span> community picks
          </div>
          <span className="chip border border-line bg-white text-slate-500">
            Session · {session.votes} {session.votes === 1 ? "vote" : "votes"}
          </span>
        </div>

        <div
          className="mb-2.5 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Choose the category to compare inside"
        >
          {pools.map((option, i) => (
            <button
              key={option.category}
              type="button"
              onClick={() => choosePool(i)}
              aria-pressed={i === round.pool}
              className={`chip border transition ${
                i === round.pool
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-slate-600 hover:border-indigo-300 hover:text-ink"
              }`}
            >
              {option.label}
              <span className={i === round.pool ? "text-white/60" : "text-slate-400"}>{option.contenders.length}</span>
            </button>
          ))}
        </div>

        <div className="mb-3 rounded-2xl border border-line bg-slate-50/80 px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Same job · same category</p>
          <p className="mt-1 text-sm font-bold text-ink">Which {pool.label} tool would you open first?</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Both cards come from {pool.label}, so the pick compares like with like. Pick another category above to
            switch jobs — a pair never mixes two categories. Names, logos and scores stay hidden until you choose.
          </p>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-2">
          <BlindCard
            side="A"
            contender={left}
            revealed={revealed}
            picked={picked}
            winner={picked === left.id}
            onPick={() => vote(left.id)}
          />
          <BlindCard
            side="B"
            contender={right}
            revealed={revealed}
            picked={picked}
            winner={picked === right.id}
            onPick={() => vote(right.id)}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink text-[11px] font-black text-white shadow-lg sm:grid"
          >
            VS
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 p-3.5">
          <p className="text-xs leading-relaxed text-muted">
            {revealed
              ? `Both tools revealed. Your pick was added to the ${pool.label} win rate — no account needed.`
              : "Names and scores stay hidden until you choose, so the badge cannot do the arguing."}
          </p>
          <button type="button" onClick={nextPair} className="btn btn-primary !py-2 text-xs">
            {revealed ? "Next matchup →" : "Skip this pair"}
          </button>
        </div>
      </div>

      <aside className="lab-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Win rates</h2>
          <span className="chip bg-brand-soft text-brand">{pool.label}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Same-category picks only — a design tool is never scored against a coding assistant, and this never changes the
          1–5 weighted leaderboard.
        </p>
        <ol className="mt-3 space-y-2">
          {table.map(({ c, record }, i) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className="w-4 text-right text-[11px] font-bold text-slate-400">{i + 1}</span>
              <AiLogo slug={c.slug} logo={c.logo} color={c.color} size={26} rounded="rounded-lg" />
              <Link href={`/ai/${c.slug}`} className="min-w-0 flex-1 truncate text-xs font-semibold text-ink hover:text-brand">
                {c.name}
              </Link>
              <span className="text-[11px] font-bold tabular-nums text-ink">{Math.round(record.rate * 100)}%</span>
              <span className="w-8 text-right text-[10px] text-muted">{record.total}</span>
            </li>
          ))}
          {table.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[11px] leading-relaxed text-muted">
              No {pool.label} picks yet. Cast the first vote and this table starts moving.
            </li>
          ) : null}
        </ol>
        <p className="mt-3 border-t border-line/70 pt-2.5 text-[10px] leading-relaxed text-muted">
          Win rate = picks won ÷ matchups entered in this category. Small samples swing fast, so read it next to the
          vote count.
        </p>
      </aside>
    </div>
  );
}
