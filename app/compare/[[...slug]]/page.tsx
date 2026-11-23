import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import CompareBuilder from "@/components/CompareBuilder";
import { AiLogo, PriceBadge, Stars, Trend } from "@/components/ui";
import { formatMoney } from "@/lib/analytics";
import { formatVotes } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { buildView, type AiStat } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug?: string[] }> };

function parseSlugs(slug?: string[]) {
  if (!slug?.length) return [];
  return slug
    .join("/")
    .split(/-vs-/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const slugs = parseSlugs(slug);
  const db = readDb();
  const names = slugs
    .map((s) => {
      const ai = db.ai.find((a) => a.slug === s);
      return ai && !ai.hidden ? ai.name : undefined;
    })
    .filter(Boolean) as string[];
  const title = names.length >= 2 ? `${names.join(" vs ")} — Comparison` : "AI Compare — 2–3 AI Side by Side";
  return {
    title,
    description:
      names.length >= 2
        ? `An honest ${names.join(" vs ")} comparison — rating, price, free plan, models and best use cases, with real user ratings.`
        : "Compare two or three AI tools side by side — rating, pricing, models and best use case.",
    alternates: { canonical: `/compare/${slugs.join("-vs-")}` },
  };
}

function buildRows(appearance: SiteSettings["appearance"]): { label: string; render: (s: AiStat) => ReactNode }[] {
  return [
  {
    label: "Weighted rating",
    render: (s) =>
      s.votes > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {/* Phones cannot fit five stars in a tool column; the score still shows. */}
          <span className="hidden sm:inline-flex">
            <Stars value={s.score} size={16} />
          </span>
          <strong>{s.score.toFixed(1)}</strong>
          <Trend trend={s.trend} />
        </span>
      ) : (
        <span className="text-muted">Not rated yet</span>
      ),
  },
  { label: "Total votes", render: (s) => `${formatVotes(s.votes)} ratings` },
  { label: "Price", render: (s) => <PriceBadge price={s.ai.priceType} /> },
  {
    label: "Free plan",
    render: (s) =>
      s.ai.priceType === "free" ? (
        <span className="font-semibold text-emerald-600">Yes, fully free</span>
      ) : s.ai.priceType === "freemium" ? (
        <span className="font-semibold text-indigo-600">Free tier available</span>
      ) : (
        <span className="font-semibold text-orange-600">Paid only</span>
      ),
  },
  { label: "Starting plan", render: (s) => formatMoney(s.ai, appearance) },
  { label: "Category", render: (s) => categoryName(s.ai.category) },
  { label: "Number of models", render: (s) => `${s.models.length} models` },
  { label: "Best for", render: (s) => s.ai.bestFor.join(", ") },
  {
    label: "Top model",
    render: (s) => {
      const top = [...s.models].sort((a, b) => b.score - a.score)[0];
      if (!top) return "—";
      return top.votes > 0 ? `${top.model.name} (${top.score.toFixed(1)} ★)` : top.model.name;
    },
  },
  {
    label: "Website",
    render: (s) => (
      <a
        href={`/go/${s.ai.slug}`}
        target="_blank"
        rel="nofollow noopener noreferrer sponsored"
        className="font-semibold text-brand"
      >
        Visit ↗
      </a>
    ),
  },
  ];
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const settings = getSiteSettings(db);
  const rows = buildRows(settings.appearance);
  const parsed = parseSlugs(slug);
  const slugs = parsed.length
    ? parsed
    : settings.compareAiIds
        .map((id) => db.ai.find((a) => a.id === id)?.slug)
        .filter((s): s is string => Boolean(s));
  // Hidden listings are not public, so they cannot be compared or picked.
  const stats = slugs
    .map((s) => [...view.aiStats.values()].find((x) => x.ai.slug === s && !x.ai.hidden))
    .filter(Boolean) as AiStat[];

  const options = db.ai
    .filter((a) => !a.hidden)
    .map((a) => ({ slug: a.slug, name: a.name, logo: a.logo, color: a.color, category: a.category }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const best = stats.length
    ? stats.reduce((a, b) => (b.score > a.score ? b : a), stats[0])
    : null;

  // Per-criterion winners, so the table highlights more than just the top score.
  const winners = new Map<string, string>();
  if (stats.length >= 2) {
    const freeRank = (s: AiStat) => (s.ai.priceType === "free" ? 0 : s.ai.priceType === "freemium" ? 1 : 2);
    const pick = (label: string, compare: (a: AiStat, b: AiStat) => number) => {
      const winner = [...stats].sort(compare)[0];
      if (winner) winners.set(label, winner.ai.id);
    };
    pick("Weighted rating", (a, b) => b.score - a.score || b.votes - a.votes);
    pick("Total votes", (a, b) => b.votes - a.votes);
    pick("Starting plan", (a, b) => (a.ai.priceType === "free" ? -1 : a.ai.planPrice) - (b.ai.priceType === "free" ? -1 : b.ai.planPrice));
    pick("Number of models", (a, b) => b.models.length - a.models.length);
    pick("Free plan", (a, b) => freeRank(a) - freeRank(b) || b.score - a.score);
    pick("Top model", (a, b) => {
      const top = (list: AiStat) => Math.max(...list.models.map((m) => m.score));
      return top(b) - top(a);
    });
  }
  const winnerRows: { label: string; hint: string; stat: AiStat }[] = [
    { label: "Weighted rating", hint: "highest user score" },
    { label: "Total votes", hint: "most rated" },
    { label: "Free plan", hint: "best free tier" },
    { label: "Starting plan", hint: "lowest entry price" },
    { label: "Number of models", hint: "widest model choice" },
  ].flatMap((row) => {
    const stat = stats.find((s) => s.ai.id === winners.get(row.label));
    return stat ? [{ ...row, stat }] : [];
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">Compare</span>
      </nav>

      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
        {stats.length >= 2 ? stats.map((s) => s.ai.name).join(" vs ") : "AI Compare"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Rating, price, free plan and models, side by side. Built from real user votes.
        {!user ? " No login needed to compare." : null}
      </p>

      {stats.length >= 2 ? (
        <>
          <div className="card mt-5">
            <table className="w-full table-fixed text-[12px] sm:text-sm">
              <colgroup>
                <col className="w-[20%]" />
                {stats.map((s) => (
                  <col key={s.ai.id} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-line bg-slate-50/70">
                  <th className="p-1.5 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 sm:p-3 sm:text-xs">
                    Compare
                  </th>
                  {stats.map((s) => (
                    <th key={s.ai.id} className="p-1.5 text-left sm:p-3">
                      <Link href={`/ai/${s.ai.slug}`} className="flex flex-wrap items-center gap-1.5 font-bold hover:text-brand">
                        <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={32} rounded="rounded-lg" />
                        {s.ai.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th className="p-1.5 text-left align-top text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 sm:p-3 sm:text-xs">
                      {row.label}
                    </th>
                    {stats.map((s) => {
                      const won = winners.get(row.label) === s.ai.id;
                      return (
                        <td
                          key={s.ai.id}
                          className={`p-1.5 align-top text-slate-700 sm:p-3 ${
                            won ? "bg-emerald-50/50 shadow-[inset_2px_0_0_#6ee7b7]" : ""
                          }`}
                        >
                          <span className="flex flex-wrap items-center gap-1">
                            {row.render(s)}
                            {won ? (
                              <span className="chip bg-emerald-100 text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-800">
                                ✓ best
                              </span>
                            ) : null}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {winnerRows.length ? (
            <div className="card mt-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Criterion winners</h2>
                <span className="chip bg-slate-100 text-slate-500">No single tool wins everything</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {winnerRows.map((row) => (
                  <div key={row.label} className="border-l-2 border-line pl-2.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{row.label}</p>
                    <Link
                      href={`/ai/${row.stat.ai.slug}`}
                      className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-brand"
                    >
                      <AiLogo
                        slug={row.stat.ai.slug}
                        logo={row.stat.ai.logo}
                        color={row.stat.ai.color}
                        size={20}
                        rounded="rounded-md"
                      />
                      {row.stat.ai.name}
                    </Link>
                    <p className="text-[10.5px] text-muted">{row.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {best ? (
            <div className="card mt-4 border-indigo-100 bg-brand-soft/40 p-4">
              <h2 className="text-sm font-bold">Verdict</h2>
              <p className="mt-1 text-sm text-slate-700">
                {best.votes > 0 ? (
                  <>
                    On weighted rating, <strong>{best.ai.name}</strong> leads ({best.score.toFixed(1)} ★,{" "}
                    {formatVotes(best.votes)} votes).
                  </>
                ) : (
                  <>None of these tools has a real rating yet, so nothing here is declared a winner.</>
                )}{" "}
                If you need a free option, start with{" "}
                {stats.find((s) => s.ai.priceType !== "paid")?.ai.name ?? best.ai.name}. Compare each tool's best use
                case first — rating is one factor, not the whole answer.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/compare/${stats.map((s) => s.ai.slug).join("-vs-")}`} className="btn btn-ghost text-xs">
              Shareable link
            </Link>
            <Link href="/compare" className="btn btn-ghost text-xs">
              New comparison
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="display text-lg text-ink">Add more AI tools</h2>
            <div className="mt-3 max-w-2xl">
              <CompareBuilder options={options} />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CompareBuilder options={options} />
          <div className="card h-fit p-5">
            <h2 className="display text-base text-ink">How comparison works</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>• Pick 2 or 3 AI tools — the URL builds itself.</li>
              <li>• Ratings are weighted real user votes.</li>
              <li>• Prices and free plans come from official pricing pages.</li>
              <li>• Share the result as a clean, indexable link.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Popular:{" "}
              <Link href="/compare/chatgpt-vs-gemini-vs-claude" className="text-brand">
                ChatGPT vs Gemini vs Claude
              </Link>
              ,{" "}
              <Link href="/compare/midjourney-vs-leonardo-ai" className="text-brand">
                Midjourney vs Leonardo
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
