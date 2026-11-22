"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiLogo } from "@/components/ui";

export type CompareOption = { slug: string; name: string; logo: string; color: string; category: string };

export default function CompareBuilder({ options }: { options: CompareOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");

  function toggle(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return [...prev.slice(1), slug];
      return [...prev, slug];
    });
  }

  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="display text-lg text-ink">Pick 2–3 AI tools to compare</h2>
        <span className="text-xs text-muted">{selected.length}/3 selected</span>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name…"
        className="field mt-3"
        aria-label="Filter AI list"
      />

      <div className="mt-3 grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((o) => {
          const active = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              onClick={() => toggle(o.slug)}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                active ? "bg-brand-soft text-brand" : "hover:bg-slate-50"
              }`}
            >
              <AiLogo slug={o.slug} logo={o.logo} color={o.color} size={32} rounded="rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{o.name}</span>
                <span className="block text-xs capitalize text-muted">{o.category}</span>
              </span>
              <span className={`text-xs font-bold ${active ? "text-brand" : "text-slate-300"}`}>
                {active ? "✓" : "+"}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? <p className="col-span-full py-4 text-center text-sm text-muted">No tools found.</p> : null}
      </div>

      <button
        onClick={() => selected.length >= 2 && router.push(`/compare/${selected.join("-vs-")}`)}
        disabled={selected.length < 2}
        className="btn btn-primary mt-4 w-full disabled:opacity-40"
      >
        Compare →
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Every comparison gets its own shareable URL, like /compare/chatgpt-vs-gemini
      </p>
    </div>
  );
}
