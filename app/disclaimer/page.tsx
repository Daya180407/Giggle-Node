import type { Metadata } from "next";
import Link from "next/link";
import CustomPageBody from "@/components/CustomPageBody";
import { customPageIsLive } from "@/lib/pages";
import { readDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Editorial independence, affiliate disclosure and limitations of the information on GigleNode.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  const page = customPageIsLive(readDb(), "disclaimer");
  if (page) return <CustomPageBody page={page} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Transparency</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Disclaimer</h1>
        <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>
      </header>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="display text-lg text-ink">Editorial independence</h2>
          <p className="mt-2">
            Rankings are generated from verified user ratings, a weighted score and recency. Advertisers and sponsors
            cannot buy a higher position, and sponsored listings are always labelled.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Affiliate links</h2>
          <p className="mt-2">
            Some outbound links may be affiliate links. If you subscribe through one, GigleNode may earn a commission at
            no extra cost to you. This never affects ratings, reviews or the ranking order.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Pricing and availability</h2>
          <p className="mt-2">
            Prices, plans and features change frequently. Figures shown here are estimates based on publicly listed
            pricing at the time of writing. Always confirm details on the tool&apos;s official website before you buy.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">No professional advice</h2>
          <p className="mt-2">
            Content on GigleNode is for general information. It is not legal, financial or professional advice, and you
            should evaluate any tool against your own requirements.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">AI accuracy</h2>
          <p className="mt-2">
            AI tools can produce incorrect or biased output. Always review generated content before publishing or
            relying on it, especially for factual, legal or medical topics.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">External links</h2>
          <p className="mt-2">
            We are not responsible for the content, policies or practices of third-party websites linked from
            GigleNode.
          </p>
        </section>

        <p className="text-xs">
          Questions? Email{" "}
          <a href="mailto:hello@giglenode.com" className="font-semibold text-brand hover:underline">
            hello@giglenode.com
          </a>{" "}
          or see our{" "}
          <Link href="/terms" className="font-semibold text-brand hover:underline">
            terms of use
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
