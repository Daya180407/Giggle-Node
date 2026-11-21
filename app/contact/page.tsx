import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact GigleNode",
  description: "Tool listings, sponsored placements, data corrections or feedback — get in touch.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    title: "General & data corrections",
    email: "hello@giglenode.com",
    note: "Wrong pricing, outdated model names or listing updates.",
  },
  {
    title: "Sponsored listings",
    email: "partners@giglenode.com",
    note: "Verified profiles, sponsorship and partnership requests.",
  },
  {
    title: "Report a fake rating",
    email: "trust@giglenode.com",
    note: "Suspicious votes, spam reviews or ranking manipulation.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Contact</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Talk to the GigleNode team</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Whether you want to list a tool, correct data or flag a fake review, email the right inbox below. We reply
          within two business days.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((channel, i) => (
          <div key={channel.email} className={`card anim-rise p-5 delay-${i + 1}`}>
            <h2 className="display text-sm leading-snug text-ink">{channel.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{channel.note}</p>
            <a
              href={`mailto:${channel.email}`}
              className="mt-3 inline-block break-all text-sm font-semibold text-brand hover:underline"
            >
              {channel.email}
            </a>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-5">
        <h2 className="display text-base text-ink">Before you write</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
          <li>• Include the exact tool and model name, plus a link if possible.</li>
          <li>• For pricing issues, share the official pricing page you are comparing against.</li>
          <li>• Sponsored placements are always labelled and never change the ranking formula.</li>
        </ul>
      </div>

      <p className="mt-5 text-xs text-muted">
        Looking for how ratings work? Read the{" "}
        <Link href="/about" className="font-semibold text-brand hover:underline">
          about page
        </Link>{" "}
        or our{" "}
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
