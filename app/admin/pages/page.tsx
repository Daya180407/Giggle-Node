import Link from "next/link";
import { savePageAction, saveSocialsAction } from "@/app/actions";
import MenuEditor from "@/components/admin/MenuEditor";
import { PAGE_INFO, PAGE_SLUGS, DEFAULT_SOCIALS, getCustomPage } from "@/lib/pages";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; saved?: string; error?: string }>;
}) {
  await requireAreaPage("pages");
  const { slug: slugParam, saved, error } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const slug = (PAGE_SLUGS as readonly string[]).includes(slugParam ?? "") ? (slugParam as string) : "about";
  const info = PAGE_INFO[slug as keyof typeof PAGE_INFO];
  const existing = getCustomPage(db, slug);
  const socials = Array.isArray(settings.socials) && settings.socials.length > 0 ? settings.socials : DEFAULT_SOCIALS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Content</p>
          <h2 className="display mt-1 text-2xl text-ink">Pages & menu</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Write About, Contact, Privacy, Terms and Disclaimer without a developer. Use <code>## heading</code>,{" "}
            <code>- bullet</code> and blank lines for paragraphs.
          </p>
        </div>
        <Link href={`/${slug}`} className="btn btn-ghost text-xs">
          View live page ↗
        </Link>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "menu"
            ? "Menu order saved."
            : saved === "socials"
              ? "Social links saved."
              : "Page saved. It is live if published is ticked."}
        </div>
      ) : null}
      {error === "title" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Add a page title.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="card h-fit p-2" aria-label="Pages">
          {PAGE_SLUGS.map((item) => {
            const page = getCustomPage(db, item);
            const active = item === slug;
            return (
              <Link
                key={item}
                href={`/admin/pages?slug=${item}`}
                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                  active ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{PAGE_INFO[item].title}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${page?.published ? "bg-emerald-500" : "bg-slate-300"}`} />
              </Link>
            );
          })}
        </nav>

        <form action={savePageAction} className="card p-4 sm:p-5">
          <input type="hidden" name="slug" value={slug} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">{info.title}</h3>
              <p className="text-xs text-muted">
                {existing
                  ? `Last saved ${new Date(existing.updatedAt).toLocaleString("en-IN")} by ${existing.updatedBy}.`
                  : "Not customised yet — the built-in page stays visible until you publish this one."}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="published"
                defaultChecked={existing?.published ?? false}
                className="h-4 w-4 accent-indigo-600"
              />
              Published
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="title">
                Page title
              </label>
              <input
                id="title"
                name="title"
                required
                maxLength={90}
                defaultValue={existing?.title ?? info.title}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="seoDescription">
                SEO description
              </label>
              <input
                id="seoDescription"
                name="seoDescription"
                maxLength={170}
                defaultValue={existing?.seoDescription ?? info.subtitle}
                className="field !py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="subtitle">
                Intro line
              </label>
              <input
                id="subtitle"
                name="subtitle"
                maxLength={220}
                defaultValue={existing?.subtitle ?? ""}
                className="field !py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="body">
                Page content
              </label>
              <textarea
                id="body"
                name="body"
                rows={16}
                maxLength={20000}
                defaultValue={existing?.body ?? ""}
                className="field font-mono text-[11px] leading-relaxed"
                placeholder={"## Our story\n\nWrite the page here.\n\n- First point\n- Second point"}
              />
              <p className="mt-1 text-[11px] text-muted">
                {existing?.body.length ?? 0}/20,000 characters. HTML is not executed — only the simple markup above.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary !py-2 text-xs">Save page</button>
          </div>
        </form>
      </div>

      <section className="card p-4 sm:p-5">
        <MenuEditor items={settings.menu ?? []} />
      </section>

      <form action={saveSocialsAction} className="card p-4 sm:p-5">
        <h3 className="text-sm font-bold">Social links</h3>
        <p className="text-xs text-muted">Shown in the footer. Leave a row empty to remove it.</p>
        <div className="mt-3 space-y-2">
          {Array.from({ length: Math.max(3, socials.length) }).map((_, index) => {
            const social = socials[index];
            return (
              <div key={index} className="grid gap-2 sm:grid-cols-[160px_1fr]">
                <input
                  name="socialLabel"
                  defaultValue={social?.label ?? ""}
                  placeholder="Instagram"
                  maxLength={24}
                  aria-label={`Social label ${index + 1}`}
                  className="field !py-2 text-xs"
                />
                <input
                  name="socialHref"
                  defaultValue={social?.href ?? ""}
                  placeholder="https://instagram.com/yourpage"
                  maxLength={200}
                  aria-label={`Social URL ${index + 1}`}
                  className="field !py-2 text-xs"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn btn-primary !py-2 text-xs">Save social links</button>
        </div>
      </form>
    </div>
  );
}
