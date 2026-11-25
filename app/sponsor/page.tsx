import type { Metadata } from "next";
import Link from "next/link";
import SponsorRequestForm from "@/components/SponsorRequestForm";
import { getCategories } from "@/lib/categories";
import { getSiteSettings } from "@/lib/settings";
import { money, SPONSOR_SLOTS, sponsorCategoryPrice, sponsorPrices } from "@/lib/sponsors";
import { allApps } from "@/lib/software";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sponsor GiggleNode — sponsored AI & app placements",
  description:
    "Put your AI tool, app or software in front of people actively comparing tools. Sponsored rows are always labelled and never change the ratings or the real ranking.",
  alternates: { canonical: "/sponsor" },
};

export default async function SponsorPage() {
  const db = readDb();
  const settings = getSiteSettings(db);
  const currency = settings.appearance.currency;
  const prices = sponsorPrices(db);
  const categories = getCategories(db);
  // Every category has its own top-3 price (fallback: the shared top-3 price).
  const categoryPrices = Object.fromEntries(categories.map((category) => [category.slug, sponsorCategoryPrice(db, category.slug)]));
  const categoryNames = new Map(categories.map((category) => [category.slug, category.name]));
  const ais = db.ai
    .filter((ai) => !ai.hidden)
    .map((ai) => ({
      id: ai.id,
      name: ai.name,
      categoryName: categoryNames.get(ai.category) ?? ai.category,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const apps = allApps(db.customApps)
    .map((app) => ({ slug: app.slug, name: app.name, kind: app.kind }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="text-center">
        <span className="chip chip-brand mx-auto">💼 Advertise</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Sponsor GiggleNode</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Get your AI tool, app or software in front of people who are actively comparing tools. Choose the exact list
          and position — your row is always labelled <strong>Sponsored</strong> and keeps its real rank, so the
          leaderboard stays honest.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
          <span className="chip bg-emerald-50 text-emerald-700">Always labelled</span>
          <span className="chip bg-slate-100 text-slate-600">Ratings &amp; rank untouched</span>
          <span className="chip bg-slate-100 text-slate-600">Manual invoice · UPI / bank</span>
        </div>
      </header>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Price list</p>
            <h2 className="display mt-1 text-xl text-ink sm:text-2xl">Where you can appear</h2>
          </div>
          <span className="text-[11px] text-muted">Prices are for 30 days · set by the GiggleNode team</span>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {SPONSOR_SLOTS.map((slot) => (
            <div
              key={slot.key}
              className={`card p-4 ${slot.key === "top3" ? "border-amber-200 bg-gradient-to-b from-amber-50/80 to-white" : ""}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {slot.key === "top3" ? "Best visibility" : `Position ${slot.position}`}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">{slot.short}</p>
              <p className="mt-2 text-xl font-extrabold text-ink">
                {money(prices[slot.key], currency)}
                <span className="ml-1 text-[10px] font-normal text-muted">/ 30 days</span>
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{slot.blurb}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 card p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Category sponsorships</p>
              <h3 className="display mt-1 text-base text-ink">Top-3 podium price per category</h3>
            </div>
            <span className="text-[11px] text-muted">30 days · all categories</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <div key={category.slug} className="rounded-xl border border-line bg-slate-50/60 px-2.5 py-2">
                <p className="truncate text-[11px] font-semibold text-slate-600">
                  {category.emoji} {category.name}
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink">
                  {money(categoryPrices[category.slug] ?? prices.top3, currency)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-muted">
            A category podium books the extra card right after that category&apos;s champion.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Pick a list and position",
            body: "AI tools appear in the AI leaderboards, apps and software in their own lists. Prices drop as you go further down the list.",
          },
          {
            step: "02",
            title: "We confirm and invoice",
            body: "Our team checks availability for that slot, then sends the invoice. Payment is a manual transfer — UPI or bank.",
          },
          {
            step: "03",
            title: "Your row goes live",
            body: "After the payment is confirmed an admin approves the request. The row shows for the booked days with a Sponsored tag.",
          },
        ].map((item) => (
          <div key={item.step} className="card p-4">
            <p className="text-[10px] font-bold tracking-[0.14em] text-brand">{item.step}</p>
            <h3 className="display mt-1 text-sm text-ink">{item.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <div id="request">
          <SponsorRequestForm
            ais={ais}
            apps={apps}
            categories={categories.map((category) => ({ slug: category.slug, name: category.name }))}
            prices={prices}
            categoryPrices={categoryPrices}
            currency={currency}
          />
        </div>

        <aside className="space-y-3">
          <section className="card p-4">
            <h2 className="display text-base text-ink">The rules</h2>
            <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-slate-600">
              <li>• Every paid row carries a visible <strong>Sponsored</strong> tag.</li>
              <li>• The listing keeps its real rank. A tool ranked #120 still shows #120, even when its card sits after the 5th row.</li>
              <li>• Paid placement never changes a rating, a score or the ranking formula.</li>
              <li>• AI tools can only appear in AI lists; apps and software only in app lists.</li>
              <li>• Sponsored rows skip filtered or searched views, so visitors never see an unrelated paid card.</li>
            </ul>
          </section>
          <section className="card p-4">
            <h2 className="display text-base text-ink">Not listed yet?</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              A sponsored row links to an existing listing. If your product is not on GiggleNode yet, suggest it first —
              an editor verifies the site and pricing before it goes live.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/submit" className="btn btn-ghost !py-2 text-xs">
                Submit a tool
              </Link>
              <Link href="/contact" className="btn btn-ghost !py-2 text-xs">
                Talk to us
              </Link>
            </div>
          </section>
          <section className="card border-slate-200 bg-slate-50/70 p-4">
            <h2 className="display text-base text-ink">Questions before paying?</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              Write to{" "}
              <a href={`mailto:${settings.supportEmail}`} className="font-semibold text-brand hover:underline">
                {settings.supportEmail}
              </a>{" "}
              with the list, position and dates you want. We reply with availability and the invoice.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
