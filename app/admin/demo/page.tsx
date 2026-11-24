import Link from "next/link";
import { removeDemoDataAction, saveDemoDataAction } from "@/app/actions";
import AiLogo from "@/components/AiLogo";
import { Stars } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import {
  DEMO_RATINGS_PER_USER,
  DEMO_USER_COUNTS,
  MAX_DEMO_USERS,
  MIN_DEMO_USERS,
  clampUsers,
  demoRatingList,
  demoSnapshot,
  demoUsersPage,
  referenceToolsInCatalogue,
} from "@/lib/demo";
import { formatVotes } from "@/lib/format";
import { requireAreaPage } from "@/lib/permissions";
import { formatDate } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function AdminDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; saved?: string; removed?: string }>;
}) {
  await requireAreaPage("users");
  const { q = "", page = "1", saved, removed } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const config = { ...settings.demo, users: clampUsers(settings.demo.users) };
  const snapshot = demoSnapshot(db);

  const startedAt = performance.now();
  const sample = config.enabled
    ? demoUsersPage(config, { page: Number(page) || 1, perPage: PER_PAGE, query: q })
    : { rows: [], total: 0, page: 1, pages: 1, scanned: 0 };
  const sampleMs = performance.now() - startedAt;

  const ratingList = demoRatingList(db, 54);
  const referenceCount = referenceToolsInCatalogue(db);
  const storedGb = Math.round((config.users * (0.0002 + DEMO_RATINGS_PER_USER * 0.00038)) / 0.1) / 10;
  const pageUrl = (nextPage: number) =>
    `/admin/demo?${new URLSearchParams({ ...(q ? { q } : {}), page: String(nextPage) }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Demo dataset</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            A million sample members with real-looking names, their ratings and reviews across the whole catalogue.
            Nothing is written to the database — the dataset is generated from a seed, so it costs no storage and can be
            removed in one tap.
          </p>
        </div>
        <span
          className={`chip ${
            config.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {config.enabled ? "● Demo data on" : "○ Demo data off"}
        </span>
      </div>

      {removed ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Demo dataset removed. Sample members, ratings and reviews are hidden everywhere; your real accounts and
          ratings were untouched.
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Demo dataset saved. The public site reflects the change immediately.
        </div>
      ) : null}

      <section
        className={`card p-4 sm:p-5 ${
          config.enabled ? "border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-sm font-bold text-ink">
              {config.enabled ? "This site is showing sample data" : "Turn the demo dataset on"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {config.enabled
                ? "Sample reviews carry a small Demo chip and a strip at the top of the public site says the data is sample data. Removing it never deletes a real account, rating or review."
                : "Adds sample members, ratings and reviews so you can see the site with a full community. You can switch it off again at any moment."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {config.enabled ? (
                <form action={removeDemoDataAction}>
                  <button className="btn bg-rose-600 text-xs text-white hover:bg-rose-700">
                    Remove all demo users — 1 tap
                  </button>
                </form>
              ) : (
                <form action={saveDemoDataAction}>
                  <input type="hidden" name="enabled" value="on" />
                  <input type="hidden" name="users" value={config.users} />
                  <button className="btn btn-primary text-xs">Turn demo dataset on</button>
                </form>
              )}
              <span className="text-[11px] text-muted">No confirmation needed. Real data is never affected.</span>
            </div>
          </div>

          <form action={saveDemoDataAction} className="w-full max-w-xs rounded-2xl border border-line bg-white p-3">
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500" htmlFor="demo-users">
              Sample members
            </label>
            <input
              id="demo-users"
              name="users"
              type="number"
              min={MIN_DEMO_USERS}
              max={MAX_DEMO_USERS}
              step={50_000}
              defaultValue={config.users}
              className="field mt-1 !py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {DEMO_USER_COUNTS.map((count) => (
                <span key={count} className="chip bg-slate-100 text-[10px] text-slate-600">
                  {formatVotes(count)}
                </span>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={config.enabled}
                className="h-4 w-4 accent-emerald-600"
              />
              Show on the public site
            </label>
            <button className="btn btn-ghost mt-3 w-full !py-2 text-xs">Save dataset size</button>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Up to {MAX_DEMO_USERS.toLocaleString("en-US")} members. Ratings scale with the member count (
              {DEMO_RATINGS_PER_USER} per member on average).
            </p>
          </form>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          {
            label: "Demo members",
            value: config.enabled ? config.users.toLocaleString("en-US") : "0",
            hint: config.enabled ? "Virtual accounts" : "Dataset is off",
          },
          {
            label: "Sample ratings",
            value: config.enabled && snapshot ? formatVotes(snapshot.ratings) : "0",
            hint: `${DEMO_RATINGS_PER_USER} per member`,
          },
          {
            label: "Tools rated",
            value: snapshot ? snapshot.byAi.size.toLocaleString("en-IN") : "0",
            hint: "Whole catalogue",
          },
          {
            label: "Rows stored",
            value: "0",
            hint: "Generated, never saved",
          },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value}</p>
            <p className="text-[10.5px] text-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">How a million members are handled</h3>
            <p className="text-xs text-muted">Why this dataset is fast and why it can be removed instantly.</p>
          </div>
          <span className="chip bg-indigo-50 text-indigo-700">
            {config.users.toLocaleString("en-IN")} users · {sampleMs.toFixed(1)} ms for this page
          </span>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {[
            {
              title: "No million-row document",
              body: `Storing ${config.users.toLocaleString("en-IN")} members and their votes in the site's JSON document would add roughly ${storedGb} GB and every rating would rewrite all of it.`,
            },
            {
              title: "Seeded, not saved",
              body: "Each member and vote is derived from its index with a fixed seed. Name, join date, country and scores stay the same between requests, with no rows written.",
            },
            {
              title: "Pages stay instant",
              body: "A page of members costs 50 lookups, and catalogue averages are counted once per request — never by scanning a million rows.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-slate-50/70 p-3">
              <p className="text-xs font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
          <div>
            <h3 className="text-sm font-bold">Rating list</h3>
            <p className="text-xs text-muted">
              The reference table&apos;s tools keep its exact scores; the rest of the catalogue gets a seeded score.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">{ratingList.length} tools · top rated</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="p-2.5">#</th>
                <th className="p-2.5">AI tool</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Demo rating</th>
                <th className="p-2.5">Ratings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ratingList.map(({ ai, agg }, index) => (
                <tr key={ai.id} className="hover:bg-slate-50/60">
                  <td className="p-2.5 font-semibold text-slate-400">{index + 1}</td>
                  <td className="p-2.5">
                    <span className="flex items-center gap-2">
                      <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={26} rounded="rounded-md" />
                      <Link href={`/ai/${ai.slug}`} className="font-semibold hover:text-brand">
                        {ai.name}
                      </Link>
                    </span>
                  </td>
                  <td className="p-2.5 text-muted">{categoryName(ai.category)}</td>
                  <td className="p-2.5">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Stars value={agg.avg} size={11} /> {agg.avg.toFixed(1)}/5
                    </span>
                  </td>
                  <td className="p-2.5 text-muted">{formatVotes(agg.votes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted">
          {referenceCount} tools carry the reference scores. Tools in the reference list that are not in the catalogue
          yet can be added from{" "}
          <Link href="/admin/ai/new" className="font-semibold text-brand">
            AI &amp; Models
          </Link>{" "}
          — their demo ratings follow automatically.
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line p-4">
          <div>
            <h3 className="text-sm font-bold">Sample members</h3>
            <p className="text-xs text-muted">
              Generated page {sample.page.toLocaleString("en-IN")} of {sample.pages.toLocaleString("en-IN")} ·{" "}
              {sample.total.toLocaleString("en-IN")} records · {sampleMs.toFixed(1)} ms
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-2" action="/admin/demo">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search a name or email…"
              className="field !w-auto !py-1.5 text-xs"
              aria-label="Search sample members"
            />
            <button className="btn btn-primary !py-1.5 text-xs">Search</button>
            {q ? (
              <Link href="/admin/demo" className="btn btn-ghost !py-1.5 text-xs">
                Reset
              </Link>
            ) : null}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="p-2.5">#</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Country</th>
                <th className="p-2.5">Joined</th>
                <th className="p-2.5">Ratings</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sample.rows.map((member, i) => (
                <tr key={member.id} className="hover:bg-slate-50/60">
                  <td className="p-2.5 text-slate-400">{q ? i + 1 : (sample.page - 1) * PER_PAGE + i + 1}</td>
                  <td className="p-2.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-[9px] font-bold text-brand">
                        {member.avatar}
                      </span>
                      {member.name}
                    </span>
                  </td>
                  <td className="p-2.5 text-muted">{member.email}</td>
                  <td className="p-2.5 text-muted">{member.country}</td>
                  <td className="p-2.5 text-muted">{formatDate(member.joinedAt)}</td>
                  <td className="p-2.5">{member.ratings}</td>
                  <td className="p-2.5">
                    {member.verified ? (
                      <span className="chip bg-emerald-50 text-emerald-700">✓ verified</span>
                    ) : (
                      <span className="chip bg-slate-100 text-slate-500">demo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sample.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {config.enabled ? "No sample member matches that search." : "Demo dataset is off — turn it on to see sample members."}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-3">
          <p className="text-[10.5px] text-muted">
            {q
              ? `Searched the first ${sample.scanned.toLocaleString("en-IN")} sample records — a production database would use a search index.`
              : "Direct page access is instant: no scan of the full member list."}
          </p>
          {sample.pages > 1 ? (
            <div className="flex items-center gap-1.5">
              {sample.page > 1 ? (
                <Link href={pageUrl(sample.page - 1)} className="btn btn-ghost !py-1.5 text-xs">
                  ← Prev
                </Link>
              ) : null}
              <span className="px-1 text-xs text-muted">
                {sample.page.toLocaleString("en-IN")} / {sample.pages.toLocaleString("en-IN")}
              </span>
              {sample.page < sample.pages ? (
                <Link href={pageUrl(sample.page + 1)} className="btn btn-ghost !py-1.5 text-xs">
                  Next →
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold">What the demo dataset adds</h3>
        <ul className="mt-2 grid gap-1.5 text-[11.5px] leading-relaxed text-slate-600 sm:grid-cols-2">
          <li>• Member count and sample ratings on the homepage.</li>
          <li>• Star scores, vote counts, distribution and medals on every ranking board.</li>
          <li>• Five-area scores and sample reviews on each AI page, labelled Demo.</li>
          <li>• Nothing in the save document: backup, export and real moderation stay clean.</li>
        </ul>
      </section>
    </div>
  );
}
