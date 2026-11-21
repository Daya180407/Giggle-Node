import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { contributorBoard } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Contributors",
  description: "The users leaving the most helpful ratings and reviews on GigleNode.",
  alternates: { canonical: "/contributors" },
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ContributorsPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const board = contributorBoard(db, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Community</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Top contributors</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          The people leaving the most ratings and helpful reviews earn a Top Reviewer badge. Score = ratings + 3 ×
          reviews.
        </p>
      </header>

      <div className="card mt-5 divide-y divide-line overflow-hidden">
        {board.map((row, i) => {
          const isMe = user?.id === row.user.id;
          return (
            <div
              key={row.user.id}
              className={`flex items-center gap-3 p-3.5 sm:p-4 ${isMe ? "bg-brand-soft/50" : ""}`}
            >
              <span className="w-8 text-center text-lg">
                {MEDALS[i] ?? <span className="text-sm font-bold text-slate-400">{i + 1}</span>}
              </span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-sm font-bold text-brand ring-1 ring-white">
                {row.user.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {row.user.name}
                  {isMe ? <span className="ml-1.5 chip bg-white text-brand">You</span> : null}
                </p>
                <p className="text-xs text-muted">
                  {row.ratings} ratings · {row.reviews} reviews
                </p>
              </div>
              <span className="display text-sm text-ink">{row.score}</span>
            </div>
          );
        })}
        {board.length === 0 ? <p className="p-8 text-center text-sm text-muted">No contributions yet.</p> : null}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        The board updates with every new rating. Fake ratings are limited by mandatory login, one rating per user per
        model and a 24-hour edit lock.
      </p>
    </div>
  );
}
