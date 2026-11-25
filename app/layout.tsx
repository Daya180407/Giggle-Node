import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TrafficBeacon from "@/components/TrafficBeacon";
import { accentVars } from "@/lib/analytics";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";
import type { CSSProperties } from "react";

const SITE_URL = "https://gigglenode.com";
const DESCRIPTION =
  "Discover the best AI tools for every job. Real user ratings, model-level detail, honest comparisons, paid-plan picks and expert guides — plus AI mobile apps and desktop software.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSiteSettings(readDb());
  const siteName = settings.siteName || "GiggleNode";
  const TITLE = `${siteName} — Find the Best AI Tools, Rated by Real Users`;
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${siteName}`,
  },
  description: DESCRIPTION,
  keywords: [
    "AI tools",
    "best AI tools 2026",
    "AI tools directory",
    "AI ranking",
    "AI comparison",
    "AI reviews",
    "AI models",
    "free AI tools",
    "AI apps",
    "AI desktop software",
    "GiggleNode",
  ],
  applicationName: "GiggleNode",
  authors: [{ name: "GiggleNode Editorial", url: `${SITE_URL}/about` }],
  creator: "GiggleNode",
  publisher: "GiggleNode",
  category: "technology",
  alternates: { canonical: "/", languages: { "en-US": "/" } },
  openGraph: {
    title: TITLE,
    description: "Real user ratings and model-level detail, so you pick the right AI the first time.",
    url: SITE_URL,
    siteName: "GiggleNode",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "GiggleNode — find the AI that actually fits your work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Real user ratings, model-level comparisons and expert guides for the best AI tools.",
    images: ["/og.png"],
    creator: "@gigglenode",
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  };
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GiggleNode",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo.png`, width: 1024, height: 1024 },
      description: "Independent AI tools directory with weighted rankings built from real user ratings.",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "GiggleNode",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const settings = getSiteSettings(readDb());
  const adsReady = settings.adsEnabled && /^ca-pub-\d{16}$/.test(settings.adsClientId);

  return (
    <html
      lang={settings.language === "hi" ? "hi" : "en"}
      data-theme={settings.appearance.theme}
      style={accentVars(settings.appearance) as CSSProperties}
    >
      <head>
        {adsReady ? <meta name="google-adsense-account" content={settings.adsClientId} /> : null}
      </head>
      <body>
        <TrafficBeacon />
        {adsReady ? (
          <Script
            id="adsense-loader"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsClientId}`}
          />
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {settings.announcementEnabled && settings.announcementText ? (
          <div className="relative z-50 bg-[#07070d] px-4 py-2 text-center text-[11px] font-medium text-slate-300 sm:text-xs">
            <span className="live-dot mr-2 align-middle" aria-hidden />
            {settings.announcementText}
            {settings.announcementHref ? (
              <a href={settings.announcementHref} className="ml-2 font-semibold text-cyan-300 hover:text-white">
                Learn more →
              </a>
            ) : null}
          </div>
        ) : null}
        <SiteHeader />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
