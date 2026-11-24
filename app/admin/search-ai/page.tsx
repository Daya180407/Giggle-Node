import Link from "next/link";
import {
  clearSearchCacheAction,
  saveAiSearchAction,
  setSearchReportStatusAction,
  testAiSearchAction,
} from "@/app/actions";
import { providerHasKey, searchUsageToday } from "@/lib/ai-search";
import { requireAreaPage } from "@/lib/permissions";
import { AI_SEARCH_PROMPT, getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini Flash-Lite", hint: "GEMINI_API_KEY · default model gemini-2.0-flash-lite" },
  { value: "groq", label: "Groq (Llama 3.1)", hint: "GROQ_API_KEY · default model llama-3.1-8b-instant" },
  { value: "deepseek", label: "DeepSeek Chat", hint: "DEEPSEEK_API_KEY · default model deepseek-chat" },
];

export default async function AdminAiSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; tested?: string; error?: string }>;
}) {
  await requireAreaPage("search");
  const { saved, tested, error } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const config = settings.aiSearch;
  const usage = searchUsageToday(db);
  const cache = (db.searchCache ?? []).slice().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const reports = db.searchAiReports ?? [];
  const openReports = reports.filter((report) => report.status === "open").length;
  const keyConfigured = providerHasKey(config);
  const maskedKey = config.apiKey ? `${config.apiKey.slice(0, 4)}…${config.apiKey.slice(-3)}` : "not set";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h2 className="display mt-1 text-2xl text-ink">AI search control</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            The model only classifies a question into a category and budget. Every AI name comes from the GigleNode
            database, so a wrong or hallucinated name is impossible.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <form action={testAiSearchAction}>
            <button className="btn btn-ghost !py-1.5 text-[11px]">Test provider</button>
          </form>
          <span className={`chip ${config.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {config.enabled ? "AI search on" : "AI search off"}
          </span>
          <span className={`chip ${keyConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {keyConfigured ? "Key configured" : "No key"}
          </span>
          <span className="chip bg-slate-100 text-slate-600">{usage.requests}/24h requests</span>
          <span className="chip bg-slate-100 text-slate-600">{cache.length} cached</span>
          <span className={`chip ${openReports ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
            {openReports} open reports
          </span>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "cache" ? "Search cache updated." : saved === "report" ? "Report status updated." : "AI search settings saved."}
        </div>
      ) : null}
      {tested ? (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
            tested === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : tested === "missing"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {tested === "ok"
            ? "Provider replied with a valid category. AI search is ready."
            : tested === "missing"
              ? "No API key yet. Paste one below, or set GEMINI_API_KEY / GROQ_API_KEY / DEEPSEEK_API_KEY in the environment."
              : "Provider test failed. The error is recorded below; keyword fallback still answers searches."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Check the limits and try again.
        </div>
      ) : null}

      <form action={saveAiSearchAction} className="space-y-4">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Which API is running</h3>
              <p className="text-xs text-muted">Switch provider without touching code. The stored key wins over the env var.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4 accent-indigo-600" />
              AI search enabled
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="provider">
                Provider
              </label>
              <select id="provider" name="provider" defaultValue={config.provider} className="field !py-2 text-xs">
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="model">
                Model override
              </label>
              <input
                id="model"
                name="model"
                defaultValue={config.model}
                placeholder="Provider default"
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="apiKey">
                API key ({maskedKey})
              </label>
              <input
                id="apiKey"
                name="apiKey"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste a new key to replace"
                className="field !py-2 text-xs"
              />
              <p className="mt-1 text-[10px] text-muted">Stored server-side only and never sent to the browser.</p>
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-line bg-slate-50/60 p-3 text-[11px] leading-relaxed text-slate-600">
            {PROVIDERS.find((provider) => provider.value === config.provider)?.hint}
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Daily limit & cache</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="dailyLimit">
                Searches per day
              </label>
              <input
                id="dailyLimit"
                name="dailyLimit"
                type="number"
                min={1}
                max={100000}
                defaultValue={config.dailyLimit}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="perMinuteLimit">
                Per minute / IP
              </label>
              <input
                id="perMinuteLimit"
                name="perMinuteLimit"
                type="number"
                min={1}
                max={200}
                defaultValue={config.perMinuteLimit}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="cacheHours">
                Cache hours
              </label>
              <input
                id="cacheHours"
                name="cacheHours"
                type="number"
                min={1}
                max={720}
                defaultValue={config.cacheHours}
                className="field !py-2 text-xs"
              />
            </div>
            <label className="flex items-end gap-2 pb-1 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="cacheEnabled"
                defaultChecked={config.cacheEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Use cache
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Over the limit, search returns a cached answer or a keyword-ranked catalogue pick instead of calling the API.
            Cache hits cost nothing. Disable the cache to always get a fresh classification.
          </p>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Prompt control</h3>
              <p className="text-xs text-muted">
                {"{{query}}"} is replaced with the visitor&apos;s question. Keep the JSON contract intact.
              </p>
            </div>
          </div>
          <textarea
            name="prompt"
            defaultValue={config.prompt}
            rows={8}
            className="field mt-3 font-mono text-[11px] leading-relaxed"
            maxLength={4000}
            aria-label="AI search prompt"
          />
          <p className="mt-2 text-[11px] text-muted">
            Last check: {config.lastCheckedAt ? new Date(config.lastCheckedAt).toLocaleString("en-IN") : "never"}.
            {config.lastError ? <span className="text-rose-600"> Error: {config.lastError}</span> : null}
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/search?q=free%20coding%20assistant" className="btn btn-ghost text-xs">
            Open public search →
          </Link>
          <div className="flex gap-2">
            <button className="btn btn-primary">Save AI search settings</button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Answer cache</h3>
              <p className="text-xs text-muted">
                Usage 24h: {usage.requests} searches · {usage.cached} from cache · {usage.llm} model calls.
              </p>
            </div>
            <form action={clearSearchCacheAction}>
              <button className="btn btn-ghost !py-1.5 text-[11px]">Clear all</button>
            </form>
          </div>
          <div className="admin-table-scroll mt-2">
            <table className="admin-table w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Query</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Hits</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cache.slice(0, 20).map((row) => (
                  <tr key={row.normalized}>
                    <td className="max-w-[200px] truncate py-2 pr-3">{row.query}</td>
                    <td className="py-2 pr-3 text-muted">{row.category || "keyword"}</td>
                    <td className="py-2 pr-3">{row.hits}</td>
                    <td className="py-2 pr-3 text-muted">{new Date(row.updatedAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-2 text-right">
                      <form action={clearSearchCacheAction}>
                        <input type="hidden" name="id" value={row.normalized} />
                        <button className="text-[11px] font-semibold text-rose-600 hover:underline">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {cache.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted">
                      Cache is empty. Searches will fill it automatically.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Wrong answer reports</h3>
          <p className="text-xs text-muted">Submitted by users from the search result card.</p>
          <div className="mt-2 divide-y divide-line">
            {reports.slice(0, 12).map((report) => (
              <div key={report.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-slate-100 text-slate-600">{report.aiName}</span>
                  <span className="text-[11px] text-muted">{new Date(report.createdAt).toLocaleString("en-IN")}</span>
                  <span className={`chip ${report.status === "open" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                    {report.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  <span className="font-semibold">“{report.query}”</span> — {report.reason}
                </p>
                <div className="mt-1 flex gap-2">
                  {(["reviewed", "dismissed", "open"] as const).map((status) => (
                    <form action={setSearchReportStatusAction} key={status}>
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="status" value={status} />
                      <button className="text-[10px] font-semibold uppercase tracking-wide text-brand hover:underline">
                        {status}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            {reports.length === 0 ? <p className="py-4 text-xs text-muted">No reports yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="card border-indigo-100 bg-brand-soft/30 p-4 text-[11px] leading-relaxed text-slate-600">
        <p className="font-bold text-slate-700">Fallback order</p>
        <p className="mt-1">
          1. Fresh cache → 2. provider classification → 3. keyword classification on our own catalogue → 4. top three AI
          overall. Invalid JSON, an unknown category or a provider timeout never crashes search. The default prompt is
          below if you ever need to restore it.
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold text-brand">Show default prompt</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 text-[10px] text-slate-600">{AI_SEARCH_PROMPT}</pre>
        </details>
      </section>
    </div>
  );
}
