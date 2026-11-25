import Link from "next/link";
import { saveAppearanceAction } from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const ACCENTS = [
  { value: "indigo", label: "Indigo", color: "#4f46e5" },
  { value: "cyan", label: "Cyan", color: "#0e7490" },
  { value: "emerald", label: "Emerald", color: "#047857" },
  { value: "rose", label: "Rose", color: "#be123c" },
  { value: "amber", label: "Amber", color: "#b45309" },
];

export default async function AdminAppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("settings");
  const { saved, error } = await searchParams;
  const db = readDb();
  const appearance = getSiteSettings(db).appearance;
  const mediaCount = db.media?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System</p>
          <h2 className="display mt-1 text-2xl text-ink">Language, currency & theme</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Prices, theme, accent colour and the site logo. Language itself is controlled in Settings → Site identity.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{appearance.currency}</span>
          <span className="chip bg-slate-100 text-slate-600">{appearance.theme} theme</span>
          <Link href="/admin/settings" className="btn btn-ghost !py-1.5 text-[11px]">
            Site identity →
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "logo" ? "Logo updated from the media library." : "Appearance settings saved."} Reload the public
          site to see the new theme.
        </div>
      ) : null}
      {error === "logo" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          The logo must be a relative path, an https:// URL, or an image from the media library.
        </div>
      ) : null}

      <form action={saveAppearanceAction} className="space-y-4">
        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Currency</h3>
          <p className="text-xs text-muted">Applied to starting-plan prices on AI, compare and search cards.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="currency">
                Show prices in
              </label>
              <select id="currency" name="currency" defaultValue={appearance.currency} className="field !py-2 text-xs">
                <option value="INR">Rupees (₹)</option>
                <option value="USD">US Dollars ($)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="usdRate">
                ₹ per $ (used when a tool has no rupee price)
              </label>
              <input
                id="usdRate"
                name="usdRate"
                type="number"
                min={1}
                max={500}
                step="0.01"
                defaultValue={appearance.usdRate}
                className="field !py-2 text-xs"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Rupee prices use each tool&apos;s stored ₹ plan when present, otherwise the USD plan × this rate.
          </p>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Theme & accent</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="theme">
                Site theme
              </label>
              <select id="theme" name="theme" defaultValue={appearance.theme} className="field !py-2 text-xs">
                {THEMES.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="accent">
                Accent colour
              </label>
              <select id="accent" name="accent" defaultValue={appearance.accent} className="field !py-2 text-xs">
                {ACCENTS.map((accent) => (
                  <option key={accent.value} value={accent.value}>
                    {accent.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-1.5">
                {ACCENTS.map((accent) => (
                  <span
                    key={accent.value}
                    className="h-6 w-6 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: accent.color }}
                    title={accent.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="chip bg-brand-soft text-brand">Brand chip</span>
            <span className="rounded-full bg-ink px-3 py-1 font-semibold text-white">Primary button preview</span>
            <span className="chip bg-slate-100 text-slate-600">Neutral chip</span>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Logo change</h3>
              <p className="text-xs text-muted">
                {mediaCount > 0
                  ? "Pick an image in Media library → Use as logo, or paste a path below."
                  : "Upload an image in the media library first, or paste a public image path."}
              </p>
            </div>
            <Link href="/admin/media" className="btn btn-ghost !py-1.5 text-[11px]">
              Media library →
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="label" htmlFor="logoImage">
                Main logo image
              </label>
              <input
                id="logoImage"
                name="logoImage"
                defaultValue={appearance.logoImage}
                placeholder="/brand/custom-logo.png or https://…"
                className="field !py-2 text-xs"
                spellCheck={false}
              />
              <p className="mt-1 text-[11px] text-muted">Leave empty to use the default GiggleNode mark.</p>
            </div>
            <div className="flex items-center gap-2">
              {appearance.logoImage ? (
                <img
                  src={appearance.logoImage}
                  alt="Current logo"
                  className="h-12 w-12 rounded-xl border border-line bg-white object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-white text-lg">
                  🤖
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-slate-50/60 p-3">
            <p className="text-xs font-semibold">Festival logo</p>
            <p className="text-[11px] text-muted">
              A temporary logo overrides the main logo until the end date (Diwali, New Year, launch weeks).
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_180px]">
              <input
                name="festiveLogo"
                defaultValue={appearance.festiveLogo}
                placeholder="Image path or https://…"
                className="field !py-2 text-xs"
                aria-label="Festival logo"
                spellCheck={false}
              />
              <input
                name="festiveLogoUntil"
                type="date"
                defaultValue={appearance.festiveLogoUntil ?? ""}
                className="field !py-2 text-xs"
                aria-label="Festival logo end date"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            Dark mode is a full site-wide palette. Some decorative gradients keep their brand tint.
          </p>
          <button className="btn btn-primary">Save appearance</button>
        </div>
      </form>
    </div>
  );
}
