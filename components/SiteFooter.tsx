import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getCategories } from "@/lib/categories";
import { menuFor, socialsFor } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

const COMPANY = [
  { href: "/about", label: "About us" },
  { href: "/contributors", label: "Top contributors" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const POPULAR = [
  { href: "/ai/chatgpt", label: "ChatGPT" },
  { href: "/ai/claude", label: "Claude" },
  { href: "/ai/midjourney", label: "Midjourney" },
  { href: "/ai/cursor", label: "Cursor" },
  { href: "/ai/elevenlabs", label: "ElevenLabs" },
  { href: "/compare/chatgpt-vs-gemini-vs-claude", label: "Compare ChatGPT vs Gemini" },
];

export default function SiteFooter() {
  const db = readDb();
  const categories = getCategories(db);
  const settings = getSiteSettings(db);
  const socials = socialsFor(db);
  const company = [
    ...COMPANY,
    ...menuFor(db, "footer").map((item) => ({ href: item.href, label: item.label })),
    ...(settings.changelogEnabled ? [{ href: "/changelog", label: "Changelog" }] : []),
  ];
  return (
    <footer className="mt-20 border-t border-line bg-[#0b1220] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="GigleNode home">
              <BrandLogo size={40} />
              <span className="display text-xl text-white">
                Gigle<span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">Node</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              An independent AI directory. Every ranking is built from real user ratings, model-level detail and
              transparent scoring — never from paid placement.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip border border-white/10 bg-white/5 text-slate-300">
                <span className="live-dot" aria-hidden /> Live rankings
              </span>
              <span className="chip border border-white/10 bg-white/5 text-slate-300">No paid ranking</span>
            </div>
            {socials.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip border border-white/10 bg-white/5 text-slate-300 transition hover:border-indigo-300/40 hover:text-white"
                  >
                    {social.label} ↗
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/category/all" className="text-slate-300 transition hover:text-white">
                  All AI rankings
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-slate-300 transition hover:text-white">
                  Compare AI tools
                </Link>
              </li>
              <li>
                <Link href="/finder" className="text-slate-300 transition hover:text-white">
                  AI Finder quiz
                </Link>
              </li>
              <li>
                <Link href="/#apps" className="text-slate-300 transition hover:text-white">
                  Mobile &amp; desktop AI
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-300 transition hover:text-white">
                  Guides &amp; blog
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="text-slate-300 transition hover:text-white">
                  My saved AI
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Categories</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-slate-300 transition hover:text-white">
                    {c.name} AI
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/category/all" className="font-semibold text-indigo-300 transition hover:text-white">
                  All categories →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Popular AI</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {POPULAR.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-300 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">GigleNode</h3>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-400 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-slate-500">
            Sponsored listings are always labelled. Ratings come from verified signed-in users, and the ranking
            formula is public.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GigleNode. All rights reserved.</p>
          <p>Built for people who create with AI.</p>
        </div>
      </div>
    </footer>
  );
}
