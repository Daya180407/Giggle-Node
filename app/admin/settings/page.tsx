import Link from "next/link";
import { changePasswordAction, saveSettingsAction } from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("settings");
  const { saved, error } = await searchParams;
  const settings = getSiteSettings(readDb());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System</p>
          <h2 className="display mt-1 text-2xl text-ink">Site settings</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            These controls apply to the public site immediately. Every save is recorded in the audit log.
          </p>
        </div>
        <Link href="/admin/export" className="btn btn-ghost text-xs">
          ⬇ Export backup
        </Link>
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">All settings & controls</h3>
            <p className="text-xs text-muted">Every configuration area, one tap away.</p>
          </div>
          <span className="chip bg-brand-soft text-brand">10 areas</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { href: "/admin/appearance", label: "Theme & Currency", hint: "Dark mode, ₹/$, logo", icon: "🎨" },
            { href: "/admin/search-ai", label: "AI Search", hint: "Provider, limits, cache", icon: "✨" },
            { href: "/admin/notifications", label: "Notifications & Email", hint: "Bell, templates, Top 5", icon: "🔔" },
            { href: "/admin/security", label: "Spam & Security", hint: "IP blocks, bad words, login", icon: "🛡️" },
            { href: "/admin/pages", label: "Pages & Menu", hint: "Legal copy, nav, socials", icon: "📄" },
            { href: "/admin/media", label: "Media Library", hint: "Images and logos", icon: "🖼️" },
            { href: "/admin/gamification", label: "Gamification", hint: "Points, badges, leaderboard", icon: "🏅" },
            { href: "/admin/feedback", label: "Feedback Inbox", hint: "Messages, bugs, requests", icon: "📬" },
            { href: "/admin/analytics", label: "Analytics & Reports", hint: "Traffic and searches", icon: "📊" },
            { href: "/admin/export", label: "Backup / Export", hint: "Restore and CSV downloads", icon: "⬇" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2.5 rounded-xl border border-line bg-slate-50/70 px-3 py-2.5 transition hover:border-brand/30 hover:bg-white"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-sm shadow-sm" aria-hidden>
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink group-hover:text-brand">{item.label}</span>
                <span className="block truncate text-[10.5px] text-muted">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "password" ? "Password changed. Use the new password next time you sign in." : "Settings saved and published."}
        </div>
      ) : null}
      {error === "password-short" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          New password must be at least 8 characters long.
        </div>
      ) : null}
      {error === "password-match" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          New password and confirmation do not match.
        </div>
      ) : null}
      {error === "password-current" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Current password is incorrect.
        </div>
      ) : null}
      {error === "email" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Support email is not valid. Use an address like hello@giglenode.com.
        </div>
      ) : null}
      {error === "ads" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Google Ads needs a valid publisher ID in the format <code>ca-pub-1234567890123456</code>. Check the ID and
          save again.
        </div>
      ) : null}

      <form action={saveSettingsAction} className="space-y-4">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Site identity</h3>
              <p className="text-xs text-muted">Browser title, brand emoji and the site language.</p>
            </div>
            <span className="chip bg-slate-100 text-slate-500">{settings.siteName}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="siteName">
                Site name
              </label>
              <input id="siteName" name="siteName" defaultValue={settings.siteName} maxLength={40} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="logoEmoji">
                Brand emoji
              </label>
              <input id="logoEmoji" name="logoEmoji" defaultValue={settings.logoEmoji} maxLength={4} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="language">
                Site language
              </label>
              <select id="language" name="language" defaultValue={settings.language} className="field">
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
              <p className="mt-1 text-[11px] text-muted">
                Sets the page language for browsers and screen readers. Content itself stays in English.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Homepage hero</h3>
              <p className="text-xs text-muted">Large headline, gradient phrase and supporting line.</p>
            </div>
            <span className="chip bg-slate-100 text-slate-500">Public homepage</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="heroTitle">
                Headline — before highlight
              </label>
              <input id="heroTitle" name="heroTitle" defaultValue={settings.heroTitle} className="field" maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="heroHighlight">
                Gradient highlight
              </label>
              <input
                id="heroHighlight"
                name="heroHighlight"
                defaultValue={settings.heroHighlight}
                className="field"
                maxLength={80}
              />
            </div>
            <div>
              <label className="label" htmlFor="heroSuffix">
                Headline — after highlight
              </label>
              <input id="heroSuffix" name="heroSuffix" defaultValue={settings.heroSuffix} className="field" maxLength={80} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="heroSubtitle">
              Hero supporting line
            </label>
            <textarea
              id="heroSubtitle"
              name="heroSubtitle"
              rows={2}
              defaultValue={settings.heroSubtitle}
              className="field"
              maxLength={400}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Preview: <span className="font-semibold text-ink">{settings.heroTitle}</span>{" "}
            <span className="font-semibold text-brand">{settings.heroHighlight}</span> {settings.heroSuffix}
          </p>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Announcement bar</h3>
              <p className="text-xs text-muted">A thin message above the header on every public page.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="announcementEnabled"
                defaultChecked={settings.announcementEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Show on site
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
            <div>
              <label className="label" htmlFor="announcementText">
                Message
              </label>
              <input
                id="announcementText"
                name="announcementText"
                defaultValue={settings.announcementText}
                className="field"
                maxLength={180}
                placeholder="New: 91 mobile apps and 95 desktop tools are live."
              />
            </div>
            <div>
              <label className="label" htmlFor="announcementHref">
                Link (relative or https://)
              </label>
              <input
                id="announcementHref"
                name="announcementHref"
                defaultValue={settings.announcementHref}
                className="field"
                maxLength={200}
                placeholder="/#apps"
              />
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Google AdSense / Google Ads</h3>
              <p className="text-xs text-muted">
                Manual display ads only — no pop-ups, anchor or vignette ads. Each placement is opt-in.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`chip ${settings.adsEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {settings.adsEnabled ? "Ads active" : "Ads off"}
              </span>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="adsEnabled"
                  defaultChecked={settings.adsEnabled}
                  className="h-4 w-4 accent-indigo-600"
                />
                Enable ads
              </label>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="adsClientId">
                AdSense publisher ID
              </label>
              <input
                id="adsClientId"
                name="adsClientId"
                defaultValue={settings.adsClientId}
                className="field"
                maxLength={40}
                placeholder="ca-pub-1234567890123456"
                spellCheck={false}
              />
              <p className="mt-1 text-[11px] text-muted">
                Public publisher ID from AdSense → Account → Settings. It is not a private API key.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="adsTopSlot">
                Homepage top banner slot
              </label>
              <input
                id="adsTopSlot"
                name="adsTopSlot"
                defaultValue={settings.adsTopSlot}
                className="field"
                maxLength={20}
                placeholder="1234567890"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label" htmlFor="adsSidebarSlot">
                AI page sidebar slot
              </label>
              <input
                id="adsSidebarSlot"
                name="adsSidebarSlot"
                defaultValue={settings.adsSidebarSlot}
                className="field"
                maxLength={20}
                placeholder="1234567890"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label" htmlFor="adsArticleSlot">
                Blog in-article slot
              </label>
              <input
                id="adsArticleSlot"
                name="adsArticleSlot"
                defaultValue={settings.adsArticleSlot}
                className="field"
                maxLength={20}
                placeholder="1234567890"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-line bg-slate-50/70 p-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-700">How to get these IDs</p>
            <p className="mt-1">
              Get your site approved in Google AdSense, create three <strong>Display ad units</strong> (homepage top,
              AI sidebar, blog in-article), then paste the publisher ID and each slot ID here. Empty slot = that placement
              stays hidden. <code>/ads.txt</code> is generated automatically from the publisher ID.
            </p>
            <p className="mt-1 text-muted">
              Ads never appear in the admin panel, login or checkout-style flows. Keep auto ads / vignettes disabled in
              AdSense to preserve the no-popup experience. For EEA/UK traffic, enable a Google-certified consent message
              in AdSense before turning ads on.
            </p>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-bold">Access & moderation</h3>
            <p className="text-xs text-muted">Switch these off during launch freezes or spam waves.</p>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowSignups"
                defaultChecked={settings.allowSignups}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-semibold">Allow new signups</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  Off = signup page shows a paused notice and the server rejects new accounts.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowRatings"
                defaultChecked={settings.allowRatings}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-semibold">Allow ratings</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  Off = rating forms are replaced with a paused notice and submissions are blocked.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="showPromotions"
                defaultChecked={settings.showPromotions}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-semibold">Show paid promotions</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  Hides the sponsored picks section on the homepage. Sponsored labels elsewhere stay visible.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="requireReviewApproval"
                defaultChecked={settings.requireReviewApproval}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-semibold">Approve reviews first</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  New written reviews wait in Ratings → Pending before they show on the site. Stars still count.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-3 max-w-sm">
            <label className="label" htmlFor="supportEmail">
              Support email
            </label>
            <input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={settings.supportEmail}
              className="field"
              placeholder="hello@giglenode.com"
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted">
            {settings.updatedAt
              ? `Last updated ${new Date(settings.updatedAt).toLocaleString("en-IN")} by ${settings.updatedBy ?? "admin"}.`
              : "No settings changes saved yet."}
          </p>
          <button className="btn btn-primary">Save & publish settings</button>
        </div>
      </form>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Admin password</h3>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Change your password here. Your current session stays active; the new password is required next time.
        </p>
        <form action={changePasswordAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              New password (min 8)
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <div className="sm:col-span-3">
            <button className="btn btn-primary !py-2 text-xs">Change password</button>
          </div>
        </form>
      </section>

      <section className="card border-amber-200 bg-amber-50/60 p-4">
        <h3 className="text-sm font-bold text-amber-900">Backups</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-amber-800">
          Export a JSON snapshot of the catalogue, ratings, posts, users (without password hashes), settings and audit log.
          Keep it somewhere safe before bulk edits or a reset.
        </p>
        <Link href="/admin/export/download" className="btn btn-ghost mt-2 !border-amber-300 !bg-white/70 !py-2 text-xs">
          Download JSON backup
        </Link>
      </section>
    </div>
  );
}
