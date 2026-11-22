import Link from "next/link";
import { deleteMediaAction, setLogoMediaAction } from "@/app/actions";
import AiLogo from "@/components/AiLogo";
import MediaUploader from "@/components/admin/MediaUploader";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("media");
  const { saved, error } = await searchParams;
  const db = readDb();
  const media = db.media ?? [];
  const totalBytes = media.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Content</p>
          <h2 className="display mt-1 text-2xl text-ink">Media library</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Logos, post images and AI artwork in one place. Uploads are compressed in the browser, then stored with the
            site data.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{media.length}/80 images</span>
          <span className="chip bg-slate-100 text-slate-600">{Math.round(totalBytes / 1024)} KB stored</span>
          <Link href="/admin/appearance" className="btn btn-ghost !py-1.5 text-[11px]">
            Use as logo →
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Media library updated.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "large"
            ? "That image is too large even after compression. Try a smaller file."
            : "Choose a valid image file."}
        </div>
      ) : null}

      <MediaUploader />

      <section className="card p-4 sm:p-5">
        <h3 className="text-sm font-bold">All images</h3>
        {media.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
            No images yet. Upload a logo or post cover above.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <div key={item.id} className="rounded-xl border border-line p-2">
                <div className="flex gap-2">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-lg border border-line bg-white object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                    <p className="text-[10px] text-muted">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                      {Math.round(item.bytes / 1024)} KB
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")} · {item.uploadedBy}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <form action={setLogoMediaAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-[11px] font-semibold text-brand hover:underline">Use as logo</button>
                  </form>
                  <form action={deleteMediaAction} className="ml-auto">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Catalogue logos</h3>
            <p className="text-xs text-muted">
              Every AI mark currently used across ranking cards and pages. Upload a new image and use it as the site
              logo, or replace a tool logo from its AI edit page.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">{db.ai.length} tools</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {db.ai.slice(0, 32).map((ai) => (
            <Link
              key={ai.id}
              href={`/ai/${ai.slug}`}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-line p-2 text-center transition hover:border-indigo-200"
            >
              <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={34} rounded="rounded-lg" />
              <span className="w-full truncate text-[10px] text-slate-600">{ai.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">
        Images are stored inside the site data document. Keep the library small: compress before upload and delete
        anything you no longer use. A separate object-storage bucket would be the next step for a very large library.
      </p>
    </div>
  );
}
