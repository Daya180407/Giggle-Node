"use client";

import { useEffect, useRef, useState } from "react";

export type HomeStat = {
  label: string;
  value: number;
  icon: "tools" | "models" | "ratings" | "guides";
  gradient: string;
  hint: string;
};

const ICONS: Record<HomeStat["icon"], React.ReactNode> = {
  tools: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  models: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="4" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.6 6L5.3 12.8M11.4 6l3.3 6.8M6.2 15h7.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  ratings: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2.2l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2L2.5 7.7l5.2-.8L10 2.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  guides: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 3.5h8.5A2.5 2.5 0 0115 6v10.5H6.5A2.5 2.5 0 014 14V3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 14a2 2 0 012-2h9M7 7h5M7 10h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

function format(value: number) {
  return value.toLocaleString("en-US");
}

export default function AnimatedStats({ stats }: { stats: HomeStat[] }) {
  const ref = useRef<HTMLDListElement>(null);
  const [values, setValues] = useState(stats.map((s) => s.value));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const duration = 1100;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValues(stats.map((s) => Math.round(s.value * eased)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setValues(stats.map(() => 0));
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [stats]);

  return (
    <dl
      ref={ref}
      className="anim-fade delay-5 mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)] sm:mt-11 sm:grid-cols-4"
    >
      {stats.map((item, i) => (
        <div
          key={item.label}
          className="group relative flex flex-col bg-[#0b0b15]/95 px-4 py-4 text-left transition-colors hover:bg-[#12121f] sm:px-5 sm:py-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 transition group-hover:scale-110"
              style={{ color: item.gradient, background: `${item.gradient}1f` }}
              aria-hidden
            >
              {ICONS[item.icon]}
            </span>
            <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-600 md:block">
              {item.hint}
            </span>
          </div>
          <dt className="order-2 mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10.5px]">
            {item.label}
          </dt>
          <dd
            className="order-1 mt-3 text-[clamp(1.65rem,3.4vw,2.35rem)] font-bold leading-none tracking-[-0.03em] text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-label={`${format(item.value)} ${item.label}`}
          >
            {format(values[i] ?? item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
