import type { Metadata } from "next";
import Link from "next/link";
import CustomPageBody from "@/components/CustomPageBody";
import { customPageIsLive } from "@/lib/pages";
import { readDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "About GiggleNode",
  description: "What GiggleNode is, how ratings work and how the ranking formula stays honest.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const page = customPageIsLive(readDb(), "about");
  if (page) return <CustomPageBody page={page} />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">About us</span>
        <h1 className="display mt-3 text-3xl leading-tight text-ink sm:text-4xl">
          An AI directory built on <span className="gradient-text">real user signal</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          GiggleNode is an independent AI trust system. Finding the right AI has become confusing — a new tool, a new
          model and a new claim every week. We replace the noise with verified ratings, model-level detail and honest
          editorial, all in one place.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Verified ratings", d: "Only signed-in users can rate. One person, one rating per model." },
          { t: "Model-level detail", d: "We score the specific model, not just the brand behind it." },
          { t: "Transparent scoring", d: "The formula is public and no payment can buy a higher rank." },
        ].map((item, i) => (
          <div key={item.t} className={`card anim-rise p-5 delay-${i + 1}`}>
            <h2 className="display text-base text-ink">{item.t}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.d}</p>
          </div>
        ))}
      </section>

      <section className="card mt-8 p-6 sm:p-7">
        <h2 className="display text-xl text-ink">How ratings work</h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
          <li className="flex gap-2">
            <span className="text-brand">•</span> You must be signed in to rate. One user, one model, one rating.
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span> Editing updates your existing rating instead of creating a new entry.
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span> After an edit, a 24-hour lock applies so rankings cannot be nudged
            repeatedly.
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span> A single IP can submit at most 20 ratings in 24 hours.
          </li>
        </ul>
      </section>

      <section className="card mt-4 p-6 sm:p-7">
        <h2 className="display text-xl text-ink">The ranking formula</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We do not rank by total stars or a simple average. We use a weighted score plus recency:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0b1220] p-4 text-xs text-slate-100">
{`Weighted score = (votes / (votes + 50)) × tool average
               + (50 / (votes + 50)) × directory average`}
        </pre>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Until a tool reaches 50 votes, it is pulled toward the directory average. After that, its own rating carries
          the weight — so a 5.0 from 2 votes can never outrank a 4.7 from 500. Ratings from the last 30 days get a 1.5×
          weight, and older ratings decay gradually.
        </p>
      </section>

      <section className="card mt-4 p-6 sm:p-7">
        <h2 className="display text-xl text-ink">Sponsored listings</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Any paid placement is always labelled “Sponsored”. Money never changes the ranking formula. Only a disclosed,
          manually labelled editor boost can apply, and it is shown on the tool page.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/category/all" className="btn btn-primary">
          Explore the rankings
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          Contact us
        </Link>
      </div>
    </div>
  );
}
