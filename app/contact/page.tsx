import type { Metadata } from "next";
import Link from "next/link";
import { submitFeedbackAction } from "@/app/actions";
import CustomPageBody from "@/components/CustomPageBody";
import { customPageIsLive } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact GigleNode",
  description: "Tool listings, sponsored placements, data corrections, feature requests and bug reports.",
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

const KINDS = [
  { value: "contact", label: "General message" },
  { value: "feature", label: "Feature request / add an AI" },
  { value: "bug", label: "Bug report" },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; type?: string; name?: string }>;
}) {
  const { sent, error, type, name } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const custom = customPageIsLive(db, "contact");
  const defaultKind = type === "feature" || type === "bug" ? type : "contact";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Contact</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Talk to the GigleNode team</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Whether you want to list a tool, correct data, request an AI or report a bug, use the form below or email{" "}
          <a href={`mailto:${settings.supportEmail}`} className="font-semibold text-brand hover:underline">
            {settings.supportEmail}
          </a>
          . Messages land in the admin inbox.
        </p>
      </header>

      {custom ? (
        <div className="mt-6">
          <CustomPageBody page={custom} embedded />
        </div>
      ) : null}

      {sent ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Thank you — your {sent === "feature" ? "feature request" : sent === "bug" ? "bug report" : "message"} is in the
          admin inbox. We read every submission.
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error === "screenshot"
            ? "The screenshot link must start with https://."
            : "Please add your name, a valid email and a message of at least 5 characters."}
        </div>
      ) : null}

      <form action={submitFeedbackAction} className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
        <input type="hidden" name="page" value="/contact" />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="kind">
            What is this about?
          </label>
          <select id="kind" name="kind" defaultValue={defaultKind} className="field">
            {KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={name ?? ""}
            className="field"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className="field" autoComplete="email" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="message">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            minLength={5}
            maxLength={2000}
            rows={5}
            className="field"
            placeholder={
              defaultKind === "feature"
                ? "Which AI should we add, and what do you use it for?"
                : defaultKind === "bug"
                  ? "What happened, on which page, and what did you expect?"
                  : "How can we help?"
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="screenshot">
            Screenshot link (optional)
          </label>
          <input
            id="screenshot"
            name="screenshot"
            maxLength={500}
            className="field"
            placeholder="https://… image link for bug reports"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            Feature requests appear in Admin → Feedback and can be approved into the catalogue.
          </p>
          <button className="btn btn-primary">Send message</button>
        </div>
      </form>

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
