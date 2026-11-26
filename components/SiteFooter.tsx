import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { NewsletterForm } from "@/components/CommunityForms";
import { menuFor, socialsFor } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

const EXPLORE = [
  { href: "/category/all", label: "All AI rankings" },
  { href: "/compare", label: "Compare AI tools" },
  { href: "/finder", label: "AI Finder quiz" },
  { href: "/#apps", label: "Mobile & desktop AI" },
  { href: "/community", label: "Community" },
  { href: "/blog", label: "Guides & blog" },
  { href: "/sponsor", label: "Sponsor GiggleNode" },
  { href: "/submit", label: "Submit a tool" },
];

const COMPANY = [
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/contributors", label: "Top contributors" },
  { href: "/owner/claim", label: "Claim a listing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Compact footer: brand + newsletter, two link columns, one legal strip. */
export default function SiteFooter() {
  const db = readDb();
  const settings = getSiteSettings(db);
  const socials = socialsFor(db);
  const company = [
    ...COMPANY,
    ...menuFor(db, "footer").map((item) => ({ href: item.href, label: item.label })),
    ...(settings.changelogEnabled ? [{ href: "/changelog", label: "Changelog" }] : []),
  ];

  return (
    <footer className="mt-12 border-t border-line bg-[#0b1220] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="GiggleNode home">
              <BrandLogo size={34} />
              <span className="display text-lg text-white">
                Giggle<span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">Node</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-slate-400">
              Independent AI directory. Rankings come from real user ratings — never from paid placement.
            </p>
            <div className="mt-3 w-full max-w-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Weekly Top 5</p>
              <NewsletterForm source="footer" />
            </div>
            {socials.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {socials.map((social) => (
                  <a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip border border-white/10 bg-white/5 text-[11px] text-slate-300 transition hover:border-indigo-300/40 hover:text-white"
                  >
                    {social.label} ↗
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Explore</h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-1">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-300 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Company</h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-1">
              {company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-300 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/feed.xml" className="text-slate-300 transition hover:text-white">
                  RSS feed
                </Link>
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip border border-white/10 bg-white/5 text-[10.5px] text-slate-400">
                <span className="live-dot" aria-hidden /> Live rankings
              </span>
              <span className="chip border border-white/10 bg-white/5 text-[10.5px] text-slate-400">Sponsored rows labelled</span>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GiggleNode. All rights reserved.</p>
          <p>Ratings are public and the ranking formula is open.</p>
        </div>
      </div>
    </footer>
  );
}
