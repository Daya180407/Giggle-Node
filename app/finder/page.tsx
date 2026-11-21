import type { Metadata } from "next";
import FinderQuiz from "@/components/FinderQuiz";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Finder Quiz — Find Your Best AI in 30 Seconds",
  description: "Three quick questions about your task, budget and experience. Get the top three AI tools for you, with live ratings.",
  alternates: { canonical: "/finder" },
};

export default async function FinderPage() {
  const db = readDb();
  const view = buildView(db);
  const options = [...view.aiStats.values()]
    .map((s) => ({
      slug: s.ai.slug,
      name: s.ai.name,
      logo: s.ai.logo,
      color: s.ai.color,
      category: s.ai.category,
      priceType: s.ai.priceType,
      planPrice: s.ai.planPrice,
      score: s.score,
      votes: s.votes,
      bestFor: s.ai.bestFor.join(" · "),
      website: s.ai.website,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="text-center">
        <span className="chip chip-brand mx-auto">⚡ AI Finder</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Find your best AI in 30 seconds</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Three short questions. Then you will get the top three tools for your work — with live ratings, pricing and a
          direct visit link.
        </p>
      </div>

      <div className="mt-7">
        <FinderQuiz options={options} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Real ratings", d: "Suggestions come from verified user votes, never from ads." },
          { t: "Budget aware", d: "Free, under $10 or under $25 — the filter respects your budget." },
          { t: "Model level", d: "See which specific model inside each AI is the strongest." },
        ].map((c, i) => (
          <div key={c.t} className={`card anim-rise p-4 delay-${i + 1}`}>
            <h2 className="display text-sm text-ink">{c.t}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
