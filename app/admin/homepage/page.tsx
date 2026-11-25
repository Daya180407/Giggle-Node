import Link from "next/link";
import { saveHomepageAction } from "@/app/actions";
import { AiLogo, Stars } from "@/components/ui";
import { getCategories } from "@/lib/categories";
import { requireAreaPage } from "@/lib/permissions";
import { buildView, rankedAis, timeAgo } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAreaPage("homepage");
  const { saved } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const view = buildView(db);
  const categories = getCategories(db);
  const tools = [...view.aiStats.values()]
    .filter((s) => !s.ai.hidden)
    .sort((a, b) => a.ai.name.localeCompare(b.ai.name));
  const keywords = [...(db.searchLogs ?? [])].sort((a, b) => b.count - a.count).slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Homepage & AI Finder</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Control the trending section, category champions, compare page and quiz questions here. Banner and hero text
            live in Site Settings.
          </p>
        </div>
        <Link href="/admin/settings" className="btn btn-ghost text-xs">
          Banner & hero →
        </Link>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Homepage controls saved.
        </div>
      ) : null}

      <form action={saveHomepageAction} className="space-y-4">
        <section className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Trending section</h3>
              <p className="text-xs text-muted">Leave empty for automatic mode (visits + new ratings).</p>
            </div>
            <span className="chip bg-slate-100 text-slate-500">
              {settings.trendingAiIds.length ? `${settings.trendingAiIds.length} manual` : "Automatic"}
            </span>
          </div>
          <select
            name="trendingAiIds"
            multiple
            size={6}
            defaultValue={settings.trendingAiIds}
            className="field mt-3"
            aria-label="Manual trending tools"
          >
            {tools.map((s) => (
              <option key={s.ai.id} value={s.ai.id}>
                {s.ai.name} — {s.score.toFixed(1)}★ ({s.votes} votes)
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">Pick up to 4 tools (Ctrl/Cmd for multiple).</p>
        </section>

        <section className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Compare page defaults</h3>
              <p className="text-xs text-muted">These tools appear in the compare table when /compare opens.</p>
            </div>
            <span className="chip bg-slate-100 text-slate-500">{settings.compareAiIds.length} picked</span>
          </div>
          <select
            name="compareAiIds"
            multiple
            size={5}
            defaultValue={settings.compareAiIds}
            className="field mt-3"
            aria-label="Default compare tools"
          >
            {tools.map((s) => (
              <option key={s.ai.id} value={s.ai.id}>
                {s.ai.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">Up to 3 tools.</p>
        </section>

        <section className="card p-4">
                      <h3 className="text-sm font-bold">Category champions</h3>
            <p className="text-xs text-muted">
              Champions are automatic: the homepage podium always shows the live #1, #2 and #3 by weighted score, so it
              updates as new ratings arrive. Leave every box on “Automatic” unless you need a deliberate editorial pick.
            </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((c) => {
              const current = settings.championOverrides[c.slug] ?? "";
              const options = rankedAis(view, c.slug);
              return (
                <div key={c.slug}>
                  <label className="label" htmlFor={`champion_${c.slug}`}>
                    {c.emoji} {c.name}
                  </label>
                  <select
                    id={`champion_${c.slug}`}
                    name={`champion_${c.slug}`}
                    defaultValue={current}
                    className="field"
                  >
                    <option value="">Automatic ({options[0]?.ai.name ?? "none"})</option>
                    {options.slice(0, 12).map((s) => (
                      <option key={s.ai.id} value={s.ai.id}>
                        {s.ai.name} — {s.score.toFixed(2)}★
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-bold">AI Finder quiz</h3>
          <p className="text-xs text-muted">
            Edit the three question texts. Options come from categories, so a new category is added to the quiz
            automatically.
          </p>
          <div className="mt-3 space-y-2">
            {settings.quizQuestions.map((q) => (
              <div key={q.id}>
                <label className="label" htmlFor={`quiz_${q.id}`}>
                  {q.id === "work" ? "Question 1 (task)" : q.id === "budget" ? "Question 2 (budget)" : "Question 3 (experience)"}
                </label>
                <input
                  id={`quiz_${q.id}`}
                  name={`quiz_${q.id}`}
                  defaultValue={q.question}
                  maxLength={140}
                  className="field"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn btn-primary">Save homepage controls</button>
        </div>
      </form>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Search keywords</h3>
            <p className="text-xs text-muted">Terms coming from public search — see what people are looking for.</p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">{keywords.length} tracked</span>
        </div>
        {keywords.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span key={k.q} className="chip bg-slate-100 text-slate-700">
                {k.q} · {k.count}× <span className="text-muted">({timeAgo(k.lastAt)})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">No searches recorded yet.</p>
        )}
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Current top 5</h3>
        <ol className="mt-2 divide-y divide-line">
          {rankedAis(view)
            .slice(0, 5)
            .map((s, i) => (
              <li key={s.ai.id} className="flex items-center gap-2 py-2 text-xs">
                <span className="w-4 font-bold text-slate-400">{i + 1}</span>
                <AiLogo slug={s.ai.slug} logo={s.ai.logo} color={s.ai.color} size={26} rounded="rounded-lg" />
                <span className="min-w-0 flex-1 truncate font-medium">{s.ai.name}</span>
                {s.ai.featured ? <span className="chip bg-indigo-50 text-indigo-700">Featured</span> : null}
                <Stars value={s.score} size={11} />
                <span className="font-semibold">{s.score.toFixed(1)}</span>
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}
