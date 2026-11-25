import type { Metadata } from "next";
import Link from "next/link";
import CustomPageBody from "@/components/CustomPageBody";
import { customPageIsLive } from "@/lib/pages";
import { readDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using GiggleNode, posting ratings and interacting with listings.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const page = customPageIsLive(readDb(), "terms");
  if (page) return <CustomPageBody page={page} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Legal</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Terms of Use</h1>
        <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>
      </header>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="display text-lg text-ink">1. Acceptance</h2>
          <p className="mt-2">
            By accessing GiggleNode you agree to these terms. If you do not agree, please do not use the site.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">2. Accounts</h2>
          <p className="mt-2">
            You are responsible for keeping your login credentials secure and for activity under your account. Provide
            accurate information and do not impersonate another person or brand.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">3. Ratings and reviews</h2>
          <p className="mt-2">
            Ratings must reflect your genuine experience with the tool. Do not post spam, abuse, hate speech or
            knowingly false claims. We may remove content or restrict accounts that manipulate rankings.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">4. Listings and sponsorship</h2>
          <p className="mt-2">
            Tool information is provided for reference and may change without notice. Paid placements are labelled
            “Sponsored”. Sponsored status does not affect the rating formula.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">5. Intellectual property</h2>
          <p className="mt-2">
            Site design, original copy and the ranking system belong to GiggleNode. Tool names, logos and trademarks
            belong to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">6. Limitation of liability</h2>
          <p className="mt-2">
            GiggleNode is provided “as is”. We do not guarantee uninterrupted availability or that any tool will meet
            your requirements. To the extent permitted by law, we are not liable for indirect or consequential loss
            arising from use of the site.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">7. Changes</h2>
          <p className="mt-2">
            We may update these terms as the product evolves. Continued use after an update means you accept the revised
            terms.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">8. Contact</h2>
          <p className="mt-2">
            For legal or terms questions, email{" "}
            <a href="mailto:hello@gigglenode.com" className="font-semibold text-brand hover:underline">
              hello@gigglenode.com
            </a>{" "}
            or visit the <Link href="/contact" className="font-semibold text-brand hover:underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
