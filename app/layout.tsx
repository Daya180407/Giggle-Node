import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://giglenode.com"),
  title: {
    default: "GigleNode — Har AI, Ek Jagah, Sahi Rating Ke Saath",
    template: "%s | GigleNode",
  },
  description:
    "Har kaam ke liye best AI dhoondhiye. Real user ratings, model-wise detail, honest comparison aur expert posts — sab ek jagah.",
  keywords: ["AI tools", "best AI", "AI ranking", "AI comparison", "Hindi AI directory", "GigleNode"],
  openGraph: {
    title: "GigleNode — Har AI, Ek Jagah, Sahi Rating Ke Saath",
    description: "Real user ratings aur model-wise detail ke saath AI dhoondhne ki jagah.",
    url: "https://giglenode.com",
    siteName: "GigleNode",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <SiteHeader />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
