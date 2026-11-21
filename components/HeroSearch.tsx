"use client";

import { useEffect, useState } from "react";

const PLACEHOLDERS = [
  'Try “best AI for YouTube thumbnails”',
  'Try “free coding assistant”',
  'Try “AI that writes blogs”',
  'Try “text to video tools”',
];

export default function HeroSearch() {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (value) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % PLACEHOLDERS.length), 3400);
    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <form action="/search" className="search-shell mx-auto mt-7 max-w-2xl" role="search">
      <div className="search-inner">
        <span className="hidden text-slate-400 sm:block" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <div className="relative flex-1">
          {!value ? (
            <span
              key={index}
              aria-hidden
              className="anim-fade pointer-events-none absolute inset-0 flex items-center truncate text-[13px] text-slate-400 sm:text-sm"
            >
              {PLACEHOLDERS[index]}
            </span>
          ) : null}
          <input
            name="q"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Search AI tools by name, category or task"
            className="search-input relative bg-transparent text-ink"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn btn-primary shrink-0 !rounded-full !px-4 sm:!px-5">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 2.5l1.7 4.3 4.3 1.7-4.3 1.7L10 14.5l-1.7-4.3L4 8.5l4.3-1.7L10 2.5z"
              fill="currentColor"
            />
          </svg>
          <span className="hidden sm:inline">Find AI</span>
        </button>
      </div>
    </form>
  );
}
