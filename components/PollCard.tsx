import Link from "next/link";
import { votePollAction } from "@/app/actions";
import { POLL_KIND_LABEL, type PollResult } from "@/lib/polls";
import type { Poll } from "@/lib/types";

/**
 * One poll card, shared by the homepage strip and the /polls page. Anyone can
 * vote: members get one vote per account, guests one vote per network. Results
 * are visible to everyone.
 */
export default function PollCard({
  poll,
  result,
  myOptionId,
  open,
  signedIn,
  ipVoted = false,
  back,
  compact = false,
}: {
  poll: Poll;
  result: PollResult;
  myOptionId: string | null;
  open: boolean;
  signedIn: boolean;
  /** this network already voted as a guest */
  ipVoted?: boolean;
  back: string;
  compact?: boolean;
}) {
  const voted = Boolean(myOptionId);
  const blocked = voted || ipVoted;

  return (
    <article className={`card flex h-full flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip bg-brand-soft text-brand">{POLL_KIND_LABEL[poll.kind]}</span>
        {poll.featured ? <span className="chip bg-amber-50 text-amber-700">Pinned</span> : null}
        <span className={`chip ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {open ? "Open" : "Closed"}
        </span>
        <span className="ml-auto text-[10.5px] text-muted">
          {result.total.toLocaleString("en-IN")} vote{result.total === 1 ? "" : "s"}
        </span>
      </div>

      <h3 className={`mt-2 font-bold leading-snug text-ink ${compact ? "text-sm" : "text-base"}`}>{poll.question}</h3>
      {poll.description ? (
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{poll.description}</p>
      ) : null}

      {open && !blocked ? (
        <form action={votePollAction} className="mt-3 space-y-1.5">
          <input type="hidden" name="pollId" value={poll.id} />
          <input type="hidden" name="back" value={back} />
          {poll.options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-slate-50/60 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-white"
            >
              <input type="radio" name="optionId" value={option.id} required className="h-3.5 w-3.5 accent-indigo-600" />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </label>
          ))}
          <button className="btn btn-primary mt-1 w-full !py-1.5 text-xs">Vote</button>
        </form>
      ) : (
        <div className="mt-3 space-y-1.5">
          {result.options.map((option) => {
            const mine = myOptionId === option.id;
            const leader = result.leaderId === option.id;
            return (
              <div
                key={option.id}
                className={`rounded-lg border px-2.5 py-1.5 ${mine ? "border-brand/40 bg-brand-soft/50" : "border-line bg-slate-50/60"}`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className={`min-w-0 flex-1 truncate ${leader ? "font-bold text-ink" : "font-medium text-slate-700"}`}>
                    {option.label}
                    {mine ? <span className="ml-1 text-[10px] font-semibold text-brand">· your vote</span> : null}
                  </span>
                  <span className="shrink-0 text-[10.5px] font-semibold text-slate-500">{option.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className={`block h-full rounded-full ${mine ? "bg-brand" : "bg-slate-400"}`}
                    style={{ width: `${Math.max(option.percent, option.votes ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-[10.5px] text-muted">
        {open && voted ? <span>Thanks for voting — one vote per person.</span> : null}
        {open && ipVoted && !voted ? <span>This network has already voted in this poll.</span> : null}
        {open && !blocked ? (
          <span>
            {signedIn ? "One vote per account." : "No login needed — one vote per network."}
          </span>
        ) : null}
        {open && !signedIn && !blocked ? (
          <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-semibold text-brand hover:underline">
            Log in instead
          </Link>
        ) : null}
        {!open ? <span>Voting closed. Results stay visible.</span> : null}
        {poll.closesAt && open ? <span className="ml-auto">Closes {poll.closesAt.slice(0, 10)}</span> : null}
      </div>
    </article>
  );
}
