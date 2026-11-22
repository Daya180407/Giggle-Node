import Link from "next/link";
import type { Metadata } from "next";
import CopyButton from "@/components/CopyButton";
import PromptSubmitForm from "@/components/PromptSubmitForm";
import { AiLogo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { isVerifiedPrompt, timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Prompt Library — Free Prompts for ChatGPT, Claude & More",
  description:
    "Browse free, ready-to-use AI prompts for ChatGPT, Claude, Gemini and more. Search by tool or task, copy any prompt and use it right away.",
  alternates: { canonical: "/prompts" },
};

const PER_PAGE = 48;

type Props = {
  searchParams: Promise<{ q?: string; ai?: string; verified?: string; page?: string }>;
};

export default async function PromptsLibraryPage({ searchParams }: Props) {
  const { q = "", ai: aiSlug = "all", verified = "", page = "1" } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);

  const publicAis = db.ai.filter((a) => !a.hidden);
  const aiById = new Map(publicAis.map((a) => [a.id, a]));
  const query = q.trim().toLowerCase();
  const selectedAi = publicAis.find((a) => a.slug === aiSlug);

  const all = (db.prompts ?? []).filter((p) => aiById.has(p.aiId));
  const filtered = all
    .filter((p) => (selectedAi ? p.aiId === selectedAi.id : true))
    .filter((p) => (verified === "1" ? isVerifiedPrompt(p) : true))
    .filter((p) => {
      if (!query) return true;
      const hay = [p.title, p.promptText, aiById.get(p.aiId)?.name ?? "", p.submittedByName ?? ""].join(" ");
      return hay.toLowerCase().includes(query);
    })
    .sort(
      (a, b) =>
        Number(isVerifiedPrompt(b)) - Number(isVerifiedPrompt(a)) ||
        +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0),
    );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  const verifiedCount = all.filter((p) => isVerifiedPrompt(p)).length;
  const communityCount = all.length - verifiedCount;
  const aiOptions = publicAis
    .filter((a) => all.some((p) => p.aiId === a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pageHref = (nextPage: number) =>
    `/prompts?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(selectedAi ? { ai: selectedAi.slug } : {}),
      ...(verified === "1" ? { verified: "1" } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="page-hero">
        <p className="eyebrow">Prompt library</p>
        <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-tight text-ink">
          Free AI prompts, ready to copy
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Practical prompts for every tool in the directory. Prompts written and checked by the GigleNode team carry a
          verified tick; community prompts are shared by signed-in members. Everything here is free to copy and use.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-slate-100 text-slate-600">{all.length} prompts</span>
          <span className="chip bg-emerald-50 text-emerald-700">✓ {verifiedCount} verified</span>
          <span className="chip bg-indigo-50 text-indigo-700">{communityCount} from the community</span>
        </div>
      </header>

      <form className="card mt-4 flex flex-wrap items-center gap-2 p-3" action="/prompts">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Search prompts by title, text or tool…"
          className="field min-w-[220px] flex-1 !py-2 text-sm"
          aria-label="Search prompts"
        />
        <select name="ai" defaultValue={selectedAi?.slug ?? "all"} className="field !w-auto !py-2 text-sm" aria-label="Filter by AI tool">
          <option value="all">All AI tools</option>
          {aiOptions.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" name="verified" value="1" defaultChecked={verified === "1"} className="h-4 w-4 accent-emerald-600" />
          Verified only
        </label>
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q || selectedAi || verified === "1" ? (
          <Link href="/prompts" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <section className="card mt-4 p-5">
        <h2 className="display text-lg text-ink">Add a prompt</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Signed-in members can add prompts to any listing. Free to add, free to use — no pricing, no paywall.
        </p>
        {user ? (
          <PromptSubmitForm
            ais={aiOptions.map((option) => ({ id: option.id, name: option.name }))}
            aiId={selectedAi?.id}
          />
        ) : (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-xs text-slate-600">
              Log in to add your own prompt. Prompts added by the site team show a verified tick.
            </p>
            <Link href="/login?next=%2Fprompts" className="btn btn-ghost mt-2 !py-1.5 text-xs">
              Log in to add a prompt
            </Link>
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((p) => {
          const ai = aiById.get(p.aiId);
          const verifiedPrompt = isVerifiedPrompt(p);
          return (
            <article key={p.id} className="card flex flex-col p-4">
              <div className="flex items-center gap-2">
                {ai ? (
                  <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={28} rounded="rounded-lg" />
                ) : null}
                {ai ? (
                  <Link href={`/ai/${ai.slug}#prompts`} className="truncate text-xs font-semibold text-slate-600 hover:text-brand">
                    {ai.name}
                  </Link>
                ) : null}
                {verifiedPrompt ? (
                  <span
                    className="chip ml-auto bg-emerald-50 text-emerald-700"
                    title="Written or checked by the GigleNode team"
                  >
                    ✓ Verified
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-sm font-bold text-ink">{p.title}</h3>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{p.promptText}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <span className="text-[10.5px] text-muted">
                  {verifiedPrompt && !p.submittedBy ? "GigleNode team" : `Community · ${p.submittedByName || "a member"}`}
                  {p.createdAt ? ` · ${timeAgo(p.createdAt)}` : ""}
                </span>
                <span className="ml-auto">
                  <CopyButton text={p.promptText} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-sm font-semibold text-ink">No prompts match these filters.</p>
          <p className="mt-1 text-xs text-muted">Try a different search, clear the filters, or add the first prompt.</p>
          <Link href="/prompts" className="btn btn-ghost mt-3 text-xs">
            Reset filters
          </Link>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Showing {filtered.length ? (pageNo - 1) * PER_PAGE + 1 : 0}–{Math.min(pageNo * PER_PAGE, filtered.length)} of{" "}
          {filtered.length}
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1.5">
            {pageNo > 1 ? (
              <Link href={pageHref(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                ← Prev
              </Link>
            ) : null}
            <span className="px-1 text-xs text-muted">
              {pageNo} / {pages}
            </span>
            {pageNo < pages ? (
              <Link href={pageHref(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
