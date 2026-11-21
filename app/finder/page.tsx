import type { Metadata } from "next";
import FinderQuiz from "@/components/FinderQuiz";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Finder Quiz — 30 Second Me Best AI Dhoondhiye",
  description: "3 sawal: kaam, budget aur level. Aapke liye top 3 AI, real rating aur visit button ke saath.",
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="chip bg-brand-soft text-brand">AI Finder</span>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Confused Hain? 30 Second Me Best AI Dhoondhiye</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          3 chhote sawal. Uske baad aapko top 3 AI milega — real user rating, price aur seedha Visit button ke saath.
        </p>
      </div>

      <div className="mt-6">
        <FinderQuiz options={options} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Real ratings", d: "Har suggestion user votes se banta hai, ads se nahi." },
          { t: "Budget aware", d: "Free se ₹1000 tak — jo budget ho, wahi filter." },
          { t: "Model level", d: "Har AI ke andar kaunsa model best hai, wo bhi dikhta hai." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <h2 className="text-sm font-bold">{c.t}</h2>
            <p className="mt-1 text-xs text-slate-600">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
