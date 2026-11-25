import Link from "next/link";
import { resetLeaderboardAction, saveGamificationAction } from "@/app/actions";
import { pointBoard } from "@/lib/gamification";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminGamificationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAreaPage("gamification");
  const { saved } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db).gamification;
  const board = pointBoard(db, 10);
  const totalPoints = (db.pointEvents ?? []).reduce((sum, event) => sum + event.points, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Gamification & points</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Points are derived from approved ratings and reviews, so deleting a rating also removes its points. Badges
            update automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${settings.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {settings.enabled ? "Points on" : "Points off"}
          </span>
          <span className="chip bg-slate-100 text-slate-600">{totalPoints.toLocaleString("en-IN")} lifetime points</span>
          <span className="chip bg-slate-100 text-slate-600">{db.ratings.length} ratings</span>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "reset" ? "Leaderboard season restarted. Old activity still exists, but it no longer counts." : "Gamification settings saved."}
        </div>
      ) : null}

      {/* Plain-language explanation, so members know what points are for. */}
      <section className="card border-indigo-200 bg-indigo-50/50 p-4">
        <h3 className="text-sm font-bold text-ink">What members do with points — in simple words</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
          <li>
            <strong>Points are a thank-you score.</strong> A member gets them for rating a tool and for writing a
            review — nothing else.
          </li>
          <li>
            <strong>Badges:</strong> {settings.badgeTopReviewer} points gives “Top Reviewer”, {settings.badgeExpert}{" "}
            gives “Expert”, and a new account shows “New User” for {settings.newUserDays} days.
          </li>
          <li>
            <strong>Leaderboard:</strong> the public Top Contributors page ranks members by points. A member can show
            their position on their profile.
          </li>
          <li>
            <strong>Not money:</strong> points cannot be cashed out, traded or spent — no store, no discount. They only
            show trust and helpfulness.
          </li>
          <li>
            <strong>Fair by design:</strong> points are counted from live ratings, so deleting a rating removes its
            points too. There is no separate balance anyone can inflate.
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-muted">
          If you later want points to unlock something (a badge colour, a shop coupon), that would be a new feature —
          today they are recognition only. The public explanation lives on /contributors.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={saveGamificationAction} className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Points & badges</h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4 accent-indigo-600" />
              Points enabled
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pointsPerRating">
                Points per rating
              </label>
              <input
                id="pointsPerRating"
                name="pointsPerRating"
                type="number"
                min={0}
                max={1000}
                defaultValue={settings.pointsPerRating}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="pointsPerReview">
                Points per written review
              </label>
              <input
                id="pointsPerReview"
                name="pointsPerReview"
                type="number"
                min={0}
                max={1000}
                defaultValue={settings.pointsPerReview}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="badgeTopReviewer">
                Top Reviewer badge at
              </label>
              <input
                id="badgeTopReviewer"
                name="badgeTopReviewer"
                type="number"
                min={0}
                max={100000}
                defaultValue={settings.badgeTopReviewer}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="badgeExpert">
                Expert badge at
              </label>
              <input
                id="badgeExpert"
                name="badgeExpert"
                type="number"
                min={0}
                max={100000}
                defaultValue={settings.badgeExpert}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="newUserDays">
                “New User” badge (days)
              </label>
              <input
                id="newUserDays"
                name="newUserDays"
                type="number"
                min={0}
                max={365}
                defaultValue={settings.newUserDays}
                className="field !py-2 text-xs"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-2.5 text-xs">
              <input
                type="checkbox"
                name="topContributorsEnabled"
                defaultChecked={settings.topContributorsEnabled}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">Show the public leaderboard</span>
                <span className="text-[11px] text-muted">Turns /contributors content on or off.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-2.5 text-xs">
              <input
                type="checkbox"
                name="monthlyReset"
                defaultChecked={settings.monthlyReset}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">Monthly leaderboard season</span>
                <span className="text-[11px] text-muted">
                  Only activity after the last reset counts toward the board.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              Last reset: {settings.lastResetAt ? new Date(settings.lastResetAt).toLocaleString("en-IN") : "never"}.
            </p>
            <button className="btn btn-primary !py-2 text-xs">Save points & badges</button>
          </div>
        </form>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Leaderboard preview</h3>
              <p className="text-xs text-muted">Exactly what the public page will show.</p>
            </div>
            <Link href="/contributors" className="text-[11px] font-semibold text-brand">
              Public page →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {board.map((row, index) => (
              <div key={row.user.id} className="flex items-center gap-2 py-2">
                <span className="w-5 text-center text-xs font-bold text-slate-500">{index + 1}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                  {row.user.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{row.user.name}</p>
                  <p className="truncate text-[10px] text-muted">
                    {row.ratings} ratings · {row.reviews} reviews · {row.badges.join(", ") || "no badge yet"}
                  </p>
                </div>
                <span className="text-xs font-bold">{row.points}</span>
              </div>
            ))}
            {board.length === 0 ? <p className="py-4 text-xs text-muted">No contributions yet.</p> : null}
          </div>
          <form action={resetLeaderboardAction} className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="text-[11px] leading-relaxed text-amber-900">
              Starting a new season sets the reset date to now. Nothing is deleted; only the leaderboard counts restart.
            </p>
            <button className="btn btn-ghost mt-2 !border-amber-300 !bg-white/70 !py-1.5 text-[11px]">
              Reset leaderboard now
            </button>
          </form>
        </section>
      </div>

      <section className="card border-indigo-100 bg-brand-soft/30 p-4 text-[11px] leading-relaxed text-slate-600">
        <p className="font-bold text-slate-700">Anti-abuse</p>
        <p className="mt-1">
          One user can rate a model once, edits are locked for 24 hours and a network is capped per day. Rejected
          reviews earn no points. IP blocking and bad-word filtering live under Spam & security.
        </p>
      </section>
    </div>
  );
}
