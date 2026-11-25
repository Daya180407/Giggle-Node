"use client";

import Link from "next/link";
import { useId, useState } from "react";

export type UploadMedia = { id: string; name: string; url: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = src;
  });
}

async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const max = 1200;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const value = canvas.toDataURL("image/jpeg", 0.78);
    if (value.length > 850_000) throw new Error("That image is still too large after resizing. Try a smaller file.");
    return value;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Featured image for a post: upload a photo or reuse an image from the media
 * library. Submits into the `coverImage` field of the post form.
 */
export default function CoverImageField({
  defaultValue,
  media,
}: {
  defaultValue: string;
  media: UploadMedia[];
}) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setValue(await prepareImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Featured image</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Shown at the top of the post and on its card. Upload a photo or pick one from the media library.
          </p>
        </div>
        <Link href="/admin/media" className="text-[11px] font-semibold text-brand hover:underline">
          Media library →
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid aspect-video place-items-center overflow-hidden rounded-xl border border-line bg-slate-50">
          {value ? (
            <img src={value} alt="Featured image preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-[11px] text-muted">No featured image yet</span>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <label className="label" htmlFor={fileId}>
              Upload from this computer
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              className="field !py-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="…or paste an image path / https:// URL"
              className="field min-w-[180px] flex-1 !py-2 text-xs"
              aria-label="Featured image path"
              spellCheck={false}
            />
            <button type="button" onClick={() => setValue("")} className="btn btn-ghost !py-1.5 text-[11px]">
              Remove
            </button>
          </div>
        </div>
      </div>

      {media.length ? (
        <div className="mt-3">
          <p className="label">Media library</p>
          <div className="mt-1 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line bg-white p-2 sm:grid-cols-8">
            {media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setValue(item.url)}
                title={item.name}
                className={`overflow-hidden rounded-lg border transition ${
                  value === item.url ? "border-indigo-500 ring-2 ring-indigo-100" : "border-line hover:border-indigo-300"
                }`}
              >
                <img src={item.url} alt={item.name} className="h-12 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
      {busy ? <p className="mt-2 text-xs text-muted">Preparing the image…</p> : null}

      <input type="hidden" name="coverImage" value={value.trim()} />
    </div>
  );
}
