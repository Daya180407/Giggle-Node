import type { Metadata } from "next";
import Link from "next/link";
import StackPlanner, { type PlannerTool } from "@/components/StackPlanner";
import { getCategories } from "@/lib/categories";
import { buildView, rankedAis } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI stack planner — build the best tool set for your budget",
  description:
    "Pick your monthly budget and what you need. GiggleNode builds the highest-rated AI stack that fits, using real user ratings and current starting prices.",
  alternates: { canonical: "/stack" },
};

export default async function StackPage() {
  const db = readDb();
  const view = buildView(db);
  const ranked = rankedAis(view);
  const categoryNames = new Map(getCategories(db).map((category) => [category.slug, category.name]));
  const categoryEmoji = new Map(getCategories(db).map((category) => [category.slug, category.emoji]));

  const tools: PlannerTool[] = ranked
    .filter((stat) => !stat.ai.hidden)
    .map((stat) => ({
      slug: stat.ai.slug,
      name: stat.ai.name,
      logo: stat.ai.logo,
      color: stat.ai.color,
      category: stat.ai.category,
      categoryName: categoryNames.get(stat.ai.category) ?? stat.ai.category,
      score: stat.score,
      votes: stat.votes,
      priceType: stat.ai.priceType,
      price: stat.ai.priceType === "free" ? 0 : Math.round(stat.ai.planPrice || 0),
    }));

  const categories = [...new Set(tools.map((tool) => tool.category))]
    .map((slug) => ({ slug, name: categoryNames.get(slug) ?? slug, emoji: categoryEmoji.get(slug) ?? "•" }))
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <span className="chip chip-brand">💰 Budget planner</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Build your AI stack</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Set a monthly budget, choose what you need it for, and get the highest-rated combination that fits. Prices are
          current starting plans; ratings are weighted real user votes.
        </p>
      </div>

      <div className="mt-7">
        <StackPlanner tools={tools} categories={categories} />
      </div>

      <div className="mt-8 card p-5">
        <h2 className="display text-base text-ink">How the planner chooses</h2>
        <ol className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li>1. Each category you pick gets the best-rated tool that still fits the remaining budget.</li>
          <li>2. Categories are filled from the strongest pick down, so your money goes to the biggest win first.</li>
          <li>3. If the best tool is over budget, it stays visible with the real price so you can decide.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Need another angle?{" "}
          <Link href="/finder" className="font-semibold text-brand hover:underline">
            Take the AI Finder quiz
          </Link>{" "}
          or{" "}
          <Link href="/category/all" className="font-semibold text-brand hover:underline">
            browse the full ranking
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
