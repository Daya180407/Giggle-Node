import type { DB, Poll } from "./types";

/**
 * Polls are stored in the site document: one row per poll plus one row per
 * member vote. Everything here is pure so the homepage, the public poll page
 * and the admin insights panel count the same way.
 */

export const POLL_KIND_LABEL: Record<Poll["kind"], string> = {
  ai: "AI comparison",
  app: "App comparison",
  custom: "Question",
};

/** A poll accepts votes while it is open and its closing date has not passed. */
export function pollIsOpen(poll: Poll, now = Date.now()): boolean {
  if (poll.status !== "open") return false;
  if (!poll.closesAt) return true;
  const closes = new Date(poll.closesAt).getTime();
  return !Number.isFinite(closes) || closes > now;
}

export function pollVotesFor(db: DB, pollId: string) {
  return (db.pollVotes ?? []).filter((vote) => vote.pollId === pollId);
}

export function myPollVote(db: DB, pollId: string, userId: string | null | undefined) {
  if (!userId) return null;
  return (db.pollVotes ?? []).find((vote) => vote.pollId === pollId && vote.userId === userId) ?? null;
}

export type PollOptionResult = { id: string; label: string; aiId?: string | null; votes: number; percent: number };

export type PollResult = {
  total: number;
  voters: number;
  options: PollOptionResult[];
  leaderId: string | null;
};

/** Vote totals per option plus unique voters (one vote per member is enforced). */
export function pollResults(db: DB, poll: Poll): PollResult {
  const votes = pollVotesFor(db, poll.id);
  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
  const total = votes.length;
  const options = poll.options.map((option) => {
    const count = counts.get(option.id) ?? 0;
    return {
      id: option.id,
      label: option.label,
      aiId: option.aiId ?? null,
      votes: count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });
  const leader = [...options].sort((a, b) => b.votes - a.votes)[0];
  return {
    total,
    voters: new Set(votes.map((vote) => vote.userId)).size,
    options,
    leaderId: leader && leader.votes > 0 ? leader.id : null,
  };
}

/** Open polls for the homepage: admin-featured first, then the newest. */
export function trendingPolls(db: DB, limit = 3, now = Date.now()): Poll[] {
  return [...(db.polls ?? [])]
    .filter((poll) => pollIsOpen(poll, now))
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    )
    .slice(0, limit);
}

/** Every poll for /polls: open ones first, then closed, newest first inside each. */
export function listedPolls(db: DB, now = Date.now()): Poll[] {
  return [...(db.polls ?? [])].sort(
    (a, b) =>
      Number(pollIsOpen(b, now)) - Number(pollIsOpen(a, now)) ||
      Number(b.featured) - Number(a.featured) ||
      +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export type PollInsight = PollResult & {
  recent: { userName: string; optionLabel: string; createdAt: string }[];
  averagePerDay: number;
  daysOpen: number;
};

/** Admin insights for one poll: totals, a per-option split and the latest votes. */
export function pollInsight(db: DB, poll: Poll, now = Date.now()): PollInsight {
  const votes = pollVotesFor(db, poll.id);
  const results = pollResults(db, poll);
  const users = new Map(db.users.map((user) => [user.id, user]));
  const labels = new Map(poll.options.map((option) => [option.id, option.label]));
  const started = new Date(poll.createdAt).getTime();
  const daysOpen = Number.isFinite(started)
    ? Math.max(1, Math.ceil((now - started) / 86400000))
    : 1;
  return {
    ...results,
    recent: [...votes]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 8)
      .map((vote) => ({
        userName: users.get(vote.userId)?.name ?? "Member",
        optionLabel: labels.get(vote.optionId) ?? "—",
        createdAt: vote.createdAt,
      })),
    daysOpen,
    averagePerDay: Math.round((results.total / daysOpen) * 10) / 10,
  };
}
