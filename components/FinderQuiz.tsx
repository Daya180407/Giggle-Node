"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiLogo, PriceBadge, Stars } from "@/components/ui";
import type { PriceType } from "@/lib/types";

export type FinderOption = {
  slug: string;
  name: string;
  logo: string;
  color: string;
  category: string;
  priceType: PriceType;
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
  { key: "free", label: "Free", note: "I only want a free tier" },
  { key: "10", label: "Under $10 / month", note: "A small monthly budget" },
  { key: "25", label: "Under $25 / month", note: "A serious creator budget" },
  { key: "any", label: "No limit", note: "Best quality is what matters" },
];

const LEVEL = [
  { key: "beginner", label: "Beginner", emoji: "🌱" },
  { key: "intermediate", label: "Intermediate", emoji: "🚀" },
  { key: "pro", label: "Pro", emoji: "🎯" },
];

export default function FinderQuiz({
  options,
  questionText,
  workOptions = WORK,
}: {
  options: FinderOption[];
  questionText?: Record<string, string>;
  workOptions?: { key: string; label: string; emoji?: string }[];
}) {
  const [step, setStep] = useState(0);
  const [work, setWork] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!work || !budget || !level) return [];
    const inCategory = options.filter((o) => o.category === work);
    const pool = inCategory.length ? inCategory : options;
    const affordable = (o: FinderOption) => {
      if (budget === "free") return o.priceType !== "paid" || o.planPrice === 0;
      if (budget === "10") return o.planPrice <= 10;
      if (budget === "25") return o.planPrice <= 25;
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
      title: questionText?.work ?? "What do you need to get done?",
      options: workOptions,
      value: work,
      onPick: (k: string) => {
        setWork(k);
        setStep(1);
      },
    },
    {
      title: questionText?.budget ?? "What is your monthly budget?",
      options: BUDGET,
      value: budget,
      onPick: (k: string) => {
        setBudget(k);
        setStep(2);
      },
    },
    {
      title: questionText?.level ?? "How experienced are you with AI tools?",
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
        <div className="card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Your matches</span>
              <h2 className="display mt-1 text-xl text-ink sm:text-2xl">Three AI tools worth trying</h2>
              <p className="mt-1 text-xs text-muted">
                {workOptions.find((w) => w.key === work)?.label} · {BUDGET.find((b) => b.key === budget)?.label} ·{" "}
                {LEVEL.find((l) => l.key === level)?.label}
              </p>
            </div>
            <button onClick={reset} className="btn btn-ghost !py-2 text-xs">
              ↻ Start over
            </button>
          </div>

          <ol className="mt-5 space-y-3">
            {results.map((row, i) => (
              <li
                key={row.slug}
                className="anim-rise rounded-2xl border border-line bg-white p-3.5 transition hover:border-indigo-200 hover:shadow-sm sm:p-4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`medal h-8 w-8 ${
                      i === 0 ? "medal-1" : i === 1 ? "medal-2" : "medal-3"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <AiLogo slug={row.slug} logo={row.logo} color={row.color} size={46} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/ai/${row.slug}`} className="font-semibold text-ink hover:text-brand">
                      {row.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Stars value={row.score} size={12} />
                      <span className="text-xs font-semibold">{row.score.toFixed(1)}</span>
                      <span className="text-xs text-muted">({row.votes.toLocaleString("en-US")} votes)</span>
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
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Results are calculated from the live ranking — as ratings change, so do the suggestions.
        </p>
      </div>
    );
  }

  const q = questions[step];
  return (
    <div className="card p-5 sm:p-7">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Question {Math.min(step + 1, total)} of {total}
        </span>
        <span>{answered} answered</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <h2 className="display mt-6 text-xl text-ink sm:text-2xl">{q.title}</h2>
      <div className={`mt-5 grid gap-2 ${step === 1 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {q.options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => q.onPick(opt.key)}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
              q.value === opt.key
                ? "border-brand bg-brand-soft shadow-sm"
                : "border-line bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"
            }`}
          >
            {"emoji" in opt ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-lg">{opt.emoji}</span>
            ) : null}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{opt.label}</span>
              {"note" in opt ? <span className="block text-xs text-muted">{opt.note}</span> : null}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost disabled:opacity-40">
          ← Back
        </button>
        <span className="text-xs text-muted">Takes about 30 seconds</span>
      </div>
    </div>
  );
}
