import Link from "next/link";
import { notFound } from "next/navigation";
import AppForm from "@/components/admin/AppForm";
import { requireAreaPage } from "@/lib/permissions";
import { allApps } from "@/lib/software";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  name: "Please enter the app name.",
  website: "Please enter a valid website link (https://…).",
  builtin: "Built-in catalogue entries cannot be replaced here — edit the rows in lib/apps instead.",
};

export default async function AdminAppFormPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string; saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { slug = "", error, saved } = await searchParams;
  const db = readDb();
  const custom = slug ? allApps(db.customApps).find((entry) => entry.slug === slug) : undefined;
  if (slug && (!custom || !(db.customApps ?? []).some((entry) => entry.slug === slug))) notFound();

  const ais = db.ai
    .filter((ai) => !ai.hidden)
    .map((ai) => ({ slug: ai.slug, name: ai.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h2 className="display mt-1 text-2xl text-ink">{custom ? `Edit ${custom.name}` : "Add an app or software"}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Apps and desktop tools are listed separately from AI tools. They can be standalone (no AI of their own,
            even when they use another AI&apos;s API) and they can carry an affiliate link.
          </p>
        </div>
        <Link href="/admin/apps" className="btn btn-ghost text-xs">
          ← All apps
        </Link>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          App saved. It is live in the public apps showcase.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERRORS[error] ?? "That change could not be saved."}
        </div>
      ) : null}

      <AppForm entry={custom ?? null} ais={ais} />
    </div>
  );
}
