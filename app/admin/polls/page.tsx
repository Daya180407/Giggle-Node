import Link from "next/link";
import { deletePollAction, savePollAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { requireAreaPage } from "@/lib/permissions";
import { POLL_KIND_LABEL, pollInsight, pollIsOpen, trendingPolls } from "@/lib/polls";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";
import type { Poll } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  question: "Write a question of at least 5 characters.",
  options: "Add at least two different options (one per line).",
};

function PollForm({ poll }: { poll?: Poll }) {
  return (
    <form action={savePollAction} className="space-y-3">
      {poll ? <input type="hidden" name="id" value={poll.id} /> : null}
      <div>
        <label className="label" htmlFor="question">
          Question *
        </label>
        <input
          id="question"
          name="question"
          required
          minLength={5}
          maxLength={140}
          defaultValue={poll?.question}
          className="field !py-2 text-sm"
          placeholder="Which AI writes better code: Claude or ChatGPT?"
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Short description (optional)
        </label>
        <input
          id="description"
          name="description"
          maxLength={240}
          defaultValue={poll?.description}
          className="field !py-2 text-sm"
          placeholder="Vote for the one you actually use for real work."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="kind">
            Poll type
          </label>
          <select id="kind" name="kind" defaultValue={poll?.kind ?? "ai"} className="field !py-2 text-sm">
            <option value="ai">AI comparison</option>
            <option value="app">App comparison</option>
            <option value="custom">Simple question</option>
          </select>
          <p className="mt-1 text-[10.5px] text-muted">AI options match a tool name or slug automatically.</p>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={poll?.status ?? "open"} className="field !py-2 text-sm">
            <option value="open">Open for votes</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="closesAt">
            Close automatically on (optional)
          </label>
          <input
            id="closesAt"
            name="closesAt"
            type="date"
            defaultValue={poll?.closesAt ? poll.closesAt.slice(0, 10) : ""}
            className="field !py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="options">
          Options * (one per line, 2–8)
        </label>
        <textarea
          id="options"
          name="options"
          required
          rows={5}
          defaultValue={poll?.options.map((option) => option.label).join("\n")}
          className="field text-sm"
          placeholder={"ChatGPT\nClaude\nGemini"}
        />
        <p className="mt-1 text-[10.5px] text-muted">
          For AI/app polls, type the exact tool name so the option links to its listing. Plain questions can use any
          line.
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <input type="checkbox" name="featured" defaultChecked={poll?.featured} className="h-4 w-4 accent-indigo-600" />
        Pin to the homepage (trending picks otherwise use the newest open polls)
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary !py-2 text-xs">{poll ? "Save poll" : "Create poll"}</button>
        {poll ? (
          <Link href="/admin/polls" className="btn btn-ghost !py-2 text-xs">
            Cancel edit
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export default async function AdminPollsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; error?: string }>;
}) {
  await requireAreaPage("homepage");
  const { edit, saved, error } = await searchParams;
  const db = readDb();
  const polls = db.polls ?? [];
  const editing = edit ? polls.find((poll) => poll.id === edit) : undefined;
  const trending = trendingPolls(db, 3);
  const totalVotes = (db.pollVotes ?? []).length;
  const openCount = polls.filter((poll) => pollIsOpen(poll)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Polls &amp; insights</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Create AI-vs-AI polls, app polls or simple questions. The homepage shows the three trending polls with a
            button to <Link href="/polls" className="font-semibold text-brand">/polls</Link>; every vote and result is
            counted here.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{polls.length} polls</span>
          <span className="chip bg-emerald-50 text-emerald-700">{openCount} open</span>
          <span className="chip bg-slate-100 text-slate-600">{totalVotes.toLocaleString("en-IN")} votes</span>
          <Link href="/polls" className="btn btn-ghost !py-1.5 text-[11px]">
            Public page ↗
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "deleted" ? "Poll deleted with its votes." : "Poll saved and published."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERROR_TEXT[error] ?? "That poll could not be saved."}
        </div>
      ) : null}

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">{editing ? "Edit poll" : "Create a poll"}</h3>
            <p className="text-xs text-muted">
              Homepage today: {trending.length ? trending.map((poll) => poll.question).join(" · ") : "no open polls yet"}
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">One vote per member or network</span>
        </div>
        <div className="mt-3">
          <PollForm poll={editing} />
        </div>
      </section>

      <section className="space-y-3">
        {polls.map((poll) => {
          const insight = pollInsight(db, poll);
          const open = pollIsOpen(poll);
          return (
            <div key={poll.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip bg-brand-soft text-brand">{POLL_KIND_LABEL[poll.kind]}</span>
                    <span className={`chip ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {open ? "Open" : "Closed"}
                    </span>
                    {poll.featured ? <span className="chip bg-amber-50 text-amber-700">Pinned</span> : null}
                    <span className="text-[10.5px] text-muted">created {timeAgo(poll.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink">{poll.question}</p>
                  {poll.description ? <p className="text-[11px] text-muted">{poll.description}</p> : null}
                </div>
                <Link href={`/admin/polls?edit=${poll.id}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                  Edit
                </Link>
                <form action={deletePollAction}>
                  <input type="hidden" name="id" value={poll.id} />
                  <DeleteButton label="Delete" message="Delete this poll and every vote on it?" />
                </form>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  { label: "Votes", value: insight.total.toLocaleString("en-IN") },
                  { label: "Members voted", value: insight.voters.toLocaleString("en-IN") },
                  { label: "Avg votes/day", value: insight.averagePerDay.toLocaleString("en-IN") },
                  { label: "Days open", value: insight.daysOpen.toLocaleString("en-IN") },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-line bg-slate-50/70 px-2.5 py-1.5">
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
                    <p className="text-sm font-extrabold text-ink">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1.5">
                {insight.options.map((option) => (
                  <div key={option.id}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-slate-700">{option.label}</span>
                      <span className="shrink-0 font-semibold text-ink">{option.votes}</span>
                      <span className="w-10 shrink-0 text-right text-[10.5px] text-muted">{option.percent}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(option.percent, option.votes ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {insight.recent.length ? (
                <details className="mt-2 border-t border-line pt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-brand">Latest votes</summary>
                  <div className="mt-1 divide-y divide-line">
                    {insight.recent.map((vote, index) => (
                      <div key={`${vote.createdAt}-${index}`} className="flex items-center justify-between gap-2 py-1 text-[11px]">
                        <span className="font-medium text-ink">{vote.userName}</span>
                        <span className="truncate text-muted">{vote.optionLabel}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(vote.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          );
        })}
        {polls.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No polls yet. Create the first one above — it appears on the homepage and on /polls.
          </div>
        ) : null}
      </section>
    </div>
  );
}
