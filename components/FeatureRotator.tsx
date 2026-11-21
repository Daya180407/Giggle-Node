"use client";

import { useEffect, useState } from "react";

const FEATURES = [
  "Real user ratings",
  "Model-level comparisons",
  "Free alternatives",
  "Expert buying guides",
  "Mobile apps & desktop software",
];

export default function FeatureRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % FEATURES.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-4 flex min-h-8 flex-wrap items-center justify-center gap-2 text-sm sm:text-base" aria-live="polite">
      <span className="text-slate-500">Built on</span>
      <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 shadow-[0_10px_30px_-22px_rgba(139,108,255,0.9)] backdrop-blur sm:min-w-[17rem]">
        <span key={FEATURES[index]} className="feature-swap hero-gradient font-semibold">
          {FEATURES[index]}
        </span>
      </span>
      <span className="hidden text-violet-300/70 sm:inline" aria-hidden>
        ✦
      </span>
    </div>
  );
}
