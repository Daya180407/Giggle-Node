import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new on GiggleNode — new features, catalogue updates and ranking changes.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  const db = readDb();
  const settings = getSiteSettings(db);
  const entries = (db.changelog ?? [])
    .filter((entry) => entry.published)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Product</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Changelog</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Every meaningful update to {settings.siteName}: new features, catalogue changes and ranking improvements.
        </p>
      </header>

      {!settings.changelogEnabled ? (
        <p className="card mt-5 p-6 text-sm text-slate-600">The public changelog is currently turned off.</p>
      ) : entries.length === 0 ? (
        <p className="card mt-5 p-6 text-sm text-slate-600">
          No published updates yet. Add one from Admin → Backup / Export → Changelog.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-brand-soft text-brand">{entry.version}</span>
                <time className="text-[11px] text-muted" dateTime={entry.at}>
                  {new Date(entry.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </time>
              </div>
              <h2 className="display mt-2 text-lg text-ink">{entry.title}</h2>
              {entry.body ? (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{entry.body}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Want a feature? <Link href="/contact?type=feature" className="font-semibold text-brand hover:underline">Send a request</Link>.
      </p>
    </div>
  );
}
