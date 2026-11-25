import Link from "next/link";
import type { Metadata } from "next";
import PollCard from "@/components/PollCard";
import { getCurrentUser } from "@/lib/auth";
import { listedPolls, myPollVote, pollIsOpen, pollResults } from "@/lib/polls";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Polls — Vote on AI Tools and Comparisons",
  description:
    "Quick polls about AI tools: compare two tools, settle a debate or answer a simple question. One vote per member, results update live.",
  alternates: { canonical: "/polls" },
};

export default async function PollsPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const polls = listedPolls(db);
  const open = polls.filter((poll) => pollIsOpen(poll));
  const closed = polls.filter((poll) => !pollIsOpen(poll));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="page-hero">
        <p className="eyebrow">Community polls</p>
        <h1 className="display mt-2 text-3xl leading-tight text-ink sm:text-4xl">Vote on the AI debate</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Quick polls from the GiggleNode team: AI vs AI, app vs app, or a simple question about how you use AI.
          Signed-in members get one vote per poll; results are public and update instantly.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-slate-100 text-slate-600">{polls.length} polls</span>
          <span className="chip bg-emerald-50 text-emerald-700">{open.length} open</span>
          {!user ? (
            <Link href="/login?next=%2Fpolls" className="font-semibold text-brand hover:underline">
              Log in to vote →
            </Link>
          ) : null}
        </div>
      </header>

      {open.length ? (
        <section className="mt-6">
          <h2 className="display text-lg text-ink">Open polls</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {open.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                result={pollResults(db, poll)}
                myOptionId={myPollVote(db, poll.id, user?.id)?.optionId ?? null}
                open
                signedIn={Boolean(user)}
                back="/polls"
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="card mt-6 p-8 text-center">
          <p className="text-sm font-semibold text-ink">No open polls right now.</p>
          <p className="mt-1 text-xs text-muted">New polls appear here and on the homepage.</p>
          <Link href="/" className="btn btn-ghost mt-3 text-xs">
            Back to homepage
          </Link>
        </div>
      )}

      {closed.length ? (
        <section className="mt-8">
          <h2 className="display text-lg text-ink">Closed polls</h2>
          <p className="text-xs text-muted">Voting has ended; the final result stays visible.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {closed.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                result={pollResults(db, poll)}
                myOptionId={myPollVote(db, poll.id, user?.id)?.optionId ?? null}
                open={false}
                signedIn={Boolean(user)}
                back="/polls"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
