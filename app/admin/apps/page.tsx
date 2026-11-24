import Link from "next/link";
import { toggleAppVisibilityAction } from "@/app/actions";
import AiLogo from "@/components/AiLogo";
import { allApps, DESKTOP_GROUPS, MOBILE_GROUPS } from "@/lib/software";
import { getSiteSettings } from "@/lib/settings";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

export default async function AdminAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", kind = "all", page = "1" } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const hidden = new Set(settings.hiddenAppSlugs ?? []);
  const query = q.trim().toLowerCase();

  const groupLabels = new Map(
    [...MOBILE_GROUPS, ...DESKTOP_GROUPS].map((group) => [group.key, group.label]),
  );

  const catalogue = allApps(db.customApps);
  const customSlugs = new Set((db.customApps ?? []).map((entry) => entry.slug));

  const entries = catalogue.filter((entry) => {
    if (kind !== "all" && entry.kind !== kind) return false;
    if (!query) return true;
    return [entry.name, entry.slug, entry.note, groupLabels.get(entry.group) ?? entry.group, entry.platforms.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = entries.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const params = (nextPage: number) =>
    `/admin/apps?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(kind !== "all" ? { kind } : {}),
      page: String(nextPage),
    }).toString()}`;

  const mobileCount = catalogue.filter((e) => e.kind === "mobile").length;
  const desktopCount = catalogue.filter((e) => e.kind === "desktop").length;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h2 className="display mt-1 text-2xl text-ink">Apps & desktop software</h2>
        <p className="mt-1 text-xs text-muted">
          {mobileCount} mobile apps · {desktopCount} desktop tools · {hidden.size} hidden from the public showcase
        </p>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/apps">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search app, platform or group…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search apps"
        />
        <select name="kind" defaultValue={kind} className="field !w-auto !py-2 text-xs" aria-label="Filter platform">
          <option value="all">Mobile + desktop</option>
          <option value="mobile">Mobile apps</option>
          <option value="desktop">PC software</option>
        </select>
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q || kind !== "all" ? (
          <Link href="/admin/apps" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{entries.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {rows.map((entry) => {
          const isHidden = hidden.has(entry.slug);
          return (
            <div key={entry.slug} className={`flex flex-wrap items-center gap-2 p-3 ${isHidden ? "bg-rose-50/30" : ""}`}>
              <AiLogo
                src={entry.aiSlug ? `/logos/${entry.aiSlug}.png` : `/app-icons/${entry.slug}.png`}
                logo={entry.emoji}
                color={entry.color}
                size={38}
                rounded="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{entry.name}</span>
                  <span className="chip bg-slate-100 text-slate-500">
                    {entry.kind === "mobile" ? "Mobile" : "PC"}
                  </span>
                  {entry.aiSlug ? <span className="chip bg-brand-soft text-brand">AI-backed</span> : null}
                  {customSlugs.has(entry.slug) ? (
                    <span className="chip bg-emerald-50 text-emerald-700">From requests</span>
                  ) : null}
                  {db.appPricing?.[entry.slug]?.plans?.length ? (
                    <span className="chip bg-emerald-50 text-emerald-700">
                      {db.appPricing[entry.slug].plans.length} plans
                    </span>
                  ) : null}
                  {isHidden ? <span className="chip bg-rose-50 text-rose-600">Hidden</span> : null}
                </div>
                <p className="truncate text-[11px] text-muted">
                  {groupLabels.get(entry.group) ?? entry.group} · {entry.platforms.join(", ")} · {entry.note}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {customSlugs.has(entry.slug) ? null : (
                  <Link href={`/admin/apps/${entry.slug}`} className="btn btn-primary !px-2 !py-1 text-xs">
                    Plans &amp; pricing
                  </Link>
                )}
                {entry.aiSlug ? (
                  <Link href={`/ai/${entry.aiSlug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                    AI page
                  </Link>
                ) : (
                  <a
                    href={entry.website}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="btn btn-ghost !px-2 !py-1 text-xs"
                  >
                    Site ↗
                  </a>
                )}
                <form action={toggleAppVisibilityAction}>
                  <input type="hidden" name="slug" value={entry.slug} />
                  <button
                    className={`btn !px-2 !py-1 text-xs ${
                      isHidden ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "btn-ghost text-rose-600"
                    }`}
                  >
                    {isHidden ? "Show on site" : "Hide"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-muted">No apps match these filters.</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Showing {entries.length ? (pageNo - 1) * PER_PAGE + 1 : 0}–{Math.min(pageNo * PER_PAGE, entries.length)} of{" "}
          {entries.length} · 100 per page. Hidden apps disappear from the homepage showcase only; AI-backed entries keep
          their public AI rating page.
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1.5">
            {pageNo > 1 ? (
              <Link href={params(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                ← Prev
              </Link>
            ) : null}
            <span className="px-1 text-xs text-muted">
              {pageNo} / {pages}
            </span>
            {pageNo < pages ? (
              <Link href={params(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
