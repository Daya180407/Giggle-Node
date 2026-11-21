import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { contributorBoard } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Contributors — GigleNode",
  description: "Sabse zyada helpful ratings aur reviews dene wale users ki Top 10 list.",
  alternates: { canonical: "/contributors" },
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ContributorsPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const board = contributorBoard(db, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Top Contributors</h1>
      <p className="mt-2 text-sm text-slate-600">
        Jo users sabse zyada ratings aur helpful reviews dete hain unhe Top Reviewer badge milta hai. Score = ratings + 3
        × reviews.
      </p>

      <div className="card mt-5 divide-y divide-line">
        {board.map((row, i) => {
          const isMe = user?.id === row.user.id;
          return (
            <div key={row.user.id} className={`flex items-center gap-3 p-3 ${isMe ? "bg-brand-soft/50" : ""}`}>
              <span className="w-8 text-center text-lg">{MEDALS[i] ?? <span className="text-sm text-slate-400">{i + 1}</span>}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-bold text-brand ring-1 ring-line">
                {row.user.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {row.user.name}
                  {isMe ? <span className="ml-1.5 chip bg-white text-brand">Aap</span> : null}
                </p>
                <p className="text-xs text-muted">
                  {row.ratings} ratings · {row.reviews} reviews
                </p>
              </div>
              <span className="text-sm font-bold">{row.score}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        Ranking har nayi rating ke saath update hoti hai. Fake ratings login, ek-user-ek-rating aur 24 ghante ke edit
        lock se roki jati hain.
      </p>
    </div>
  );
}
