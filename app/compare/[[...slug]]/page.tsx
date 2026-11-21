import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import CompareBuilder from "@/components/CompareBuilder";
import { AiLogo, PriceBadge, Stars, Trend } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { buildView, type AiStat } from "@/lib/rank";
import { readDb } from "@/lib/store";

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
    .map((s) => db.ai.find((a) => a.slug === s)?.name)
    .filter(Boolean) as string[];
  const title = names.length >= 2 ? `${names.join(" vs ")} — Comparison` : "AI Compare — 2–3 AI Side by Side";
  return {
    title,
    description:
      names.length >= 2
        ? `${names.join(" vs ")} ka honest comparison — rating, price, free plan, models aur best for. Real user ratings ke saath.`
        : "Do ya teen AI tools ko side by side compare kijiye — rating, pricing, models aur best use case.",
    alternates: { canonical: `/compare/${slugs.join("-vs-")}` },
  };
}

const ROWS: { label: string; render: (s: AiStat) => ReactNode }[] = [
  {
    label: "Weighted rating",
    render: (s) => (
      <span className="flex items-center gap-1.5">
        <Stars value={s.score} size={13} />
        <strong>{s.score.toFixed(1)}</strong>
        <Trend trend={s.trend} />
      </span>
    ),
  },
  { label: "Total votes", render: (s) => `${s.votes.toLocaleString("en-IN")} ratings` },
  { label: "Price", render: (s) => <PriceBadge price={s.ai.priceType} /> },
  {
    label: "Free hai ya nahi",
    render: (s) =>
      s.ai.priceType === "free" ? (
        <span className="font-semibold text-green-600">Haan, poora free</span>
      ) : s.ai.priceType === "freemium" ? (
        <span className="font-semibold text-indigo-600">Free tier available</span>
      ) : (
        <span className="font-semibold text-orange-600">Nahi, paid only</span>
      ),
  },
  { label: "Starting plan", render: (s) => (s.ai.priceType === "free" ? "₹0" : `$${s.ai.planPrice}/month`) },
  { label: "Category", render: (s) => categoryName(s.ai.category) },
  { label: "Models ki sankhya", render: (s) => `${s.models.length} models` },
  { label: "Best for", render: (s) => s.ai.bestFor.join(", ") },
  {
    label: "Top model",
    render: (s) => {
      const top = [...s.models].sort((a, b) => b.score - a.score)[0];
      return top ? `${top.model.name} (${top.score.toFixed(1)} ★)` : "—";
    },
  },
  {
    label: "Website",
    render: (s) => (
      <a
        href={s.ai.website}
        target="_blank"
        rel="nofollow noopener noreferrer sponsored"
        className="font-semibold text-brand"
      >
        Visit ↗
      </a>
    ),
  },
];

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const view = buildView(db);
  const slugs = parseSlugs(slug);
  const stats = slugs.map((s) => [...view.aiStats.values()].find((x) => x.ai.slug === s)).filter(Boolean) as AiStat[];

  const options = db.ai
    .map((a) => ({ slug: a.slug, name: a.name, logo: a.logo, color: a.color, category: a.category }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const best = stats.length
    ? stats.reduce((a, b) => (b.score > a.score ? b : a), stats[0])
    : null;

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
        Rating, price, free plan aur models — sab side by side. Real user votes se banaya gaya comparison.
        {!user ? " Compare karne ke liye login ki zarurat nahi." : null}
      </p>

      {stats.length >= 2 ? (
        <>
          <div className="card mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/70">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Compare
                  </th>
                  {stats.map((s) => (
                    <th key={s.ai.id} className="p-3 text-left">
                      <Link href={`/ai/${s.ai.slug}`} className="flex items-center gap-2 font-bold hover:text-brand">
                        <AiLogo logo={s.ai.logo} color={s.ai.color} size={30} />
                        {s.ai.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th className="p-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {row.label}
                    </th>
                    {stats.map((s) => (
                      <td key={s.ai.id} className="p-3 align-top text-slate-700">
                        {row.render(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {best ? (
            <div className="card mt-4 border-indigo-100 bg-brand-soft/40 p-4">
              <h2 className="text-sm font-bold">Verdict</h2>
              <p className="mt-1 text-sm text-slate-700">
                Weighted rating ke hisab se <strong>{best.ai.name}</strong> sabse aage hai ({best.score.toFixed(1)} ★,{" "}
                {best.votes} votes). Free chahiye to {stats.find((s) => s.ai.priceType !== "paid")?.ai.name ?? best.ai.name}{" "}
                se shuru kijiye — sabse pehle best for set compare kijiye, rating ek factor hai, poora answer nahi.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/compare/${stats.map((s) => s.ai.slug).join("-vs-")}`} className="btn btn-ghost text-xs">
              Link share kijiye
            </Link>
            <Link href="/compare" className="btn btn-ghost text-xs">
              Nayi comparison banaiye
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="text-base font-bold">Aur AI add kijiye</h2>
            <div className="mt-3 max-w-2xl">
              <CompareBuilder options={options} />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CompareBuilder options={options} />
          <div className="card h-fit p-5">
            <h2 className="text-sm font-bold">Compare kaise kaam karta hai</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>• 2 ya 3 AI chuniye — URL automatically ban jata hai.</li>
              <li>• Rating real user votes se banti hai (weighted).</li>
              <li>• Price aur free plan official pricing se.</li>
              <li>• Result share kijiye — SEO friendly link milta hai.</li>
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
