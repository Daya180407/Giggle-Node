import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">G</span>
            <span className="text-lg font-extrabold">
              Gigle<span className="text-brand">Node</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Har kaam ke liye best AI, real user rating ke saath. Ranking sirf votes aur quality se banti hai — koi paid
            ranking nahi.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Categories</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="text-slate-600 hover:text-brand">
                  {c.name} AI
                </Link>
              </li>
            ))}
            <li>
              <Link href="/category/all" className="font-semibold text-brand">
                Saare categories →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Top AI</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/ai/chatgpt" className="text-slate-600 hover:text-brand">
                ChatGPT
              </Link>
            </li>
            <li>
              <Link href="/ai/claude" className="text-slate-600 hover:text-brand">
                Claude
              </Link>
            </li>
            <li>
              <Link href="/ai/midjourney" className="text-slate-600 hover:text-brand">
                Midjourney
              </Link>
            </li>
            <li>
              <Link href="/ai/cursor" className="text-slate-600 hover:text-brand">
                Cursor
              </Link>
            </li>
            <li>
              <Link href="/compare/chatgpt-vs-gemini-vs-claude" className="text-slate-600 hover:text-brand">
                Compare AI
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">GigleNode</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-slate-600 hover:text-brand">
                About
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-slate-600 hover:text-brand">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/finder" className="text-slate-600 hover:text-brand">
                AI Finder Quiz
              </Link>
            </li>
            <li>
              <Link href="/contributors" className="text-slate-600 hover:text-brand">
                Top Contributors
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-slate-600 hover:text-brand">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-slate-600 hover:text-brand">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GigleNode · giglenode.com</p>
          <p>Sponsored listings always labelled. Ratings real users se aate hain.</p>
        </div>
      </div>
    </footer>
  );
}
