import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { badgesFor, pointBoard } from "@/lib/gamification";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Contributors",
  description: "The users earning the most points for helpful ratings and reviews on GigleNode.",
  alternates: { canonical: "/contributors" },
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ContributorsPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const settings = getSiteSettings(db).gamification;
  const board = settings.topContributorsEnabled ? pointBoard(db, 10) : [];
  const myBadges = user ? badgesFor(db, user, 0) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Community</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Top contributors</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Earn {settings.pointsPerRating} points for a rating and {settings.pointsPerReview} for a written review.
          Badges: Top Reviewer at {settings.badgeTopReviewer} points, Expert at {settings.badgeExpert}.
          {settings.monthlyReset ? " The leaderboard resets every season." : ""}
        </p>
      </header>

      {!settings.topContributorsEnabled ? (
        <div className="card mt-5 p-6 text-sm text-slate-600">
          The public leaderboard is currently turned off by the administrator. Ratings still count normally.
        </div>
      ) : (
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
                  <p className="flex flex-wrap items-center gap-1 truncate text-sm font-semibold text-ink">
                    {row.user.name}
                    {isMe ? <span className="chip bg-white text-brand">You</span> : null}
                    {row.badges.slice(0, 2).map((badge) => (
                      <span key={badge} className="chip bg-indigo-50 text-indigo-700">
                        {badge}
                      </span>
                    ))}
                  </p>
                  <p className="text-xs text-muted">
                    {row.ratings} ratings · {row.reviews} reviews
                  </p>
                </div>
                <span className="text-right">
                  <span className="display block text-sm text-ink">{row.points}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">points</span>
                </span>
              </div>
            );
          })}
          {board.length === 0 ? <p className="p-8 text-center text-sm text-muted">No contributions yet.</p> : null}
        </div>
      )}

      {user && myBadges.length ? (
        <p className="mt-3 text-xs text-muted">Your badges: {myBadges.join(", ")}.</p>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Points come from genuine ratings only. Fake votes are limited by mandatory login, one rating per user per model
        and a 24-hour edit lock. Rejected reviews do not earn points.
      </p>
    </div>
  );
}
