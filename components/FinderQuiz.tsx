"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiLogo, PriceBadge, Stars } from "@/components/ui";

export type FinderOption = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  category: string;
  priceType: "free" | "freemium" | "paid";
  planPrice: number;
  score: number;
  votes: number;
  bestFor: string;
  website: string;
};

const WORK = [
  { key: "video", label: "Video", emoji: "🎬" },
  { key: "image", label: "Photo / Image", emoji: "🖼️" },
  { key: "coding", label: "Coding", emoji: "⌨️" },
  { key: "writing", label: "Writing", emoji: "✍️" },
  { key: "music", label: "Music", emoji: "🎵" },
];

const BUDGET = [
  { key: "free", label: "Free", note: "₹0 — free tier hi chahiye" },
  { key: "500", label: "₹500 tak", note: "mahine ka chhota budget" },
  { key: "1000", label: "₹1000 tak", note: "serious creator budget" },
  { key: "any", label: "Koi limit nahi", note: "best quality matter karti hai" },
];

const LEVEL = [
  { key: "beginner", label: "Beginner", emoji: "🌱" },
  { key: "intermediate", label: "Intermediate", emoji: "🚀" },
  { key: "pro", label: "Pro", emoji: "🎯" },
];

const USD_TO_INR = 85;

export default function FinderQuiz({ options }: { options: FinderOption[] }) {
  const [step, setStep] = useState(0);
  const [work, setWork] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!work || !budget || !level) return [];
    const inCategory = options.filter((o) => o.category === work);
    const pool = inCategory.length ? inCategory : options;
    const affordable = (o: FinderOption) => {
      const monthlyInr = o.planPrice * USD_TO_INR;
      if (budget === "free") return o.priceType !== "paid" || o.planPrice === 0;
      if (budget === "500") return monthlyInr <= 500;
      if (budget === "1000") return monthlyInr <= 1000;
      return true;
    };
    let filtered = pool.filter(affordable);
    if (filtered.length < 3) filtered = pool;
    const bonus = (o: FinderOption) =>
      (level === "beginner" && (o.priceType === "free" || o.priceType === "freemium") ? 0.15 : 0) +
      (level === "pro" && o.votes > 60 ? 0.1 : 0);
    return [...filtered]
      .sort((a, b) => b.score + bonus(b) - (a.score + bonus(a)) || b.votes - a.votes)
      .slice(0, 3);
  }, [options, work, budget, level]);

  const total = 3;
  const answered = [work, budget, level].filter(Boolean).length;
  const done = Boolean(work && budget && level);

  function reset() {
    setStep(0);
    setWork(null);
    setBudget(null);
    setLevel(null);
  }

  const questions = [
    {
      title: "Aapko kya kaam karna hai?",
      options: WORK,
      value: work,
      onPick: (k: string) => {
        setWork(k);
        setStep(1);
      },
    },
    {
      title: "Budget kya hai?",
      options: BUDGET,
      value: budget,
      onPick: (k: string) => {
        setBudget(k);
        setStep(2);
      },
    },
    {
      title: "Aapka level kya hai?",
      options: LEVEL,
      value: level,
      onPick: (k: string) => {
        setLevel(k);
        setStep(3);
      },
    },
  ];

  if (done) {
    return (
      <div>
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Aapke liye 3 best AI</h2>
              <p className="text-xs text-muted">
                {WORK.find((w) => w.key === work)?.label} · {BUDGET.find((b) => b.key === budget)?.label} ·{" "}
                {LEVEL.find((l) => l.key === level)?.label}
              </p>
            </div>
            <button onClick={reset} className="btn btn-ghost">
              ↻ Dobara try kijiye
            </button>
          </div>

          <ol className="mt-4 space-y-3">
            {results.map((row, i) => (
              <li key={row.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
                  {i + 1}
                </span>
                <AiLogo logo={row.logo} color={row.color} size={42} />
                <div className="min-w-0 flex-1">
                  <Link href={`/ai/${row.slug}`} className="font-semibold hover:text-brand">
                    {row.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Stars value={row.score} size={12} />
                    <span className="text-xs font-semibold">{row.score.toFixed(1)}</span>
                    <span className="text-xs text-muted">({row.votes} votes)</span>
                    <PriceBadge price={row.priceType} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{row.bestFor}</p>
                </div>
                <a
                  href={row.website}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="btn btn-primary !py-1.5 text-xs"
                >
                  Visit
                </a>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Result live ranking se banta hai — jaise user ratings badhti hain, suggestion bhi badalta hai.
        </p>
      </div>
    );
  }

  const q = questions[step];
  return (
    <div className="card p-5 sm:p-7">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Sawal {Math.min(step + 1, total)} / {total}
        </span>
        <span>{answered} answered</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <h2 className="mt-5 text-lg font-bold sm:text-xl">{q.title}</h2>
      <div className={`mt-4 grid gap-2 ${step === 1 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {q.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => q.onPick(opt.key)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
              q.value === opt.key ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-indigo-200"
            }`}
          >
            {"emoji" in opt ? <span className="text-xl">{opt.emoji}</span> : null}
            <span>
              <span className="block text-sm font-semibold">{opt.label}</span>
              {"note" in opt ? <span className="block text-xs text-muted">{opt.note}</span> : null}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn btn-ghost disabled:opacity-40"
        >
          ← Peeche
        </button>
        <span className="text-xs text-muted">30 second me result</span>
      </div>
    </div>
  );
}
