"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PLACEHOLDERS = [
  'Try “best AI for YouTube thumbnails”',
  'Try “free coding assistant”',
  'Try “AI that writes blogs”',
  'Try “text to video tools”',
];

type Suggestion = { name: string; slug: string; logo: string; color: string; category: string; score: number };

export default function HeroSearch() {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (value) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % PLACEHOLDERS.length), 3400);
    return () => window.clearInterval(timer);
  }, [value]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((payload: { suggestions?: Suggestion[] }) => {
          setSuggestions(payload.suggestions ?? []);
          setOpen(true);
        })
        .catch(() => {
          /* typeahead is optional */
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <form
      ref={wrapRef}
      action="/search"
      className="search-shell relative mx-auto mt-7 max-w-2xl"
      role="search"
    >
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
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            aria-label="Search AI tools by name, category or task"
            aria-autocomplete="list"
            aria-expanded={open}
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

      {open && suggestions.length > 0 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-slate-900/10">
          <ul className="divide-y divide-line" role="listbox" aria-label="AI suggestions">
            {suggestions.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/ai/${item.slug}`}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm"
                    style={{ borderColor: `${item.color}40`, color: item.color }}
                    aria-hidden
                  >
                    {item.logo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                    <span className="block truncate text-[11px] text-muted">{item.category}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500">{item.score.toFixed(1)}★</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/search?q=${encodeURIComponent(value)}`}
            className="block border-t border-line bg-slate-50/70 px-3 py-2 text-xs font-semibold text-brand hover:bg-slate-100"
          >
            See all results for “{value}” →
          </Link>
        </div>
      ) : null}
    </form>
  );
}
