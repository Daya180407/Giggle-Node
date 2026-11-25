import type { Metadata } from "next";
import Link from "next/link";
import CustomPageBody from "@/components/CustomPageBody";
import { customPageIsLive } from "@/lib/pages";
import { readDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What GiggleNode collects, what stays public, where data is stored and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const page = customPageIsLive(readDb(), "privacy");
  if (page) return <CustomPageBody page={page} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">Legal</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>
      </header>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="display text-lg text-ink">What we collect</h2>
          <ul className="mt-2 space-y-2">
            <li>• <strong>Account:</strong> your name and email address, used for sign-in.</li>
            <li>• <strong>Ratings:</strong> your star rating, review and timestamp — these are public.</li>
            <li>• <strong>Saved tools and follows</strong> — visible only inside your account.</li>
            <li>• <strong>Abuse prevention:</strong> your IP address, retained for 24-hour rate limiting only.</li>
          </ul>
        </section>

        <section>
          <h2 className="display text-lg text-ink">What is public</h2>
          <p className="mt-2">
            Your display name, avatar initial, ratings and reviews appear on AI and model pages. Your email address is
            never shown publicly.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Where data is stored</h2>
          <p className="mt-2">
            The current deployment stores its database in a private object store on the hosting platform and uses signed
            session cookies. In the production setup described for this project, data lives in Supabase (Postgres and
            Auth). Images are served from the application or the configured storage provider, and notification emails
            are sent through the configured email provider.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Your rights</h2>
          <p className="mt-2">
            You can edit your own rating at any time, subject to the 24-hour edit lock. To delete your account or your
            reviews, email{" "}
            <a href="mailto:privacy@gigglenode.com" className="font-semibold text-brand hover:underline">
              privacy@gigglenode.com
            </a>{" "}
            and we will action the request.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Advertising</h2>
          <p className="mt-2">
            We may show inline display ads through Google AdSense. When ads are enabled, Google and its partners may use
            cookies or device identifiers to serve and measure ads, including personalized ads based on your prior
            visits to this and other sites. We do not share your account email or ratings with advertisers. You can
            manage personalized advertising at{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              Google Ads Settings
            </a>
            . For visitors in the EEA, UK or Switzerland, consent is requested through Google&apos;s consent management
            tools where enabled.
          </p>
          <p className="mt-2">
            Ads are placed inside page content only. GiggleNode does not use pop-up, pop-under, anchor or vignette ad
            formats.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Cookies</h2>
          <p className="mt-2">
            We use a single session cookie to keep you signed in. If advertising is enabled, Google AdSense may also set
            advertising and measurement cookies as described above.
          </p>
        </section>

        <section>
          <h2 className="display text-lg text-ink">Contact</h2>
          <p className="mt-2">
            Questions about this policy? Reach us at{" "}
            <a href="mailto:privacy@gigglenode.com" className="font-semibold text-brand hover:underline">
              privacy@gigglenode.com
            </a>{" "}
            or through the <Link href="/contact" className="font-semibold text-brand hover:underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
