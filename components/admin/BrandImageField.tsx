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

/** Resizes an upload in the browser and returns a compact data URL. */
async function prepareImage(file: File, max: number, quality: number): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser");
    // Keep transparency for PNG/WebP/GIF; flatten photos on white.
    const keepAlpha = /png|webp|gif/i.test(file.type);
    if (!keepAlpha) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const value = keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
    // The image travels inside the form post, so keep it well under the action limit.
    if (value.length > 700_000) throw new Error("That image is still too large after resizing. Try a smaller or simpler file.");
    return value;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Brand image for the public header/footer. Accepts a fresh upload, an image
 * from the media library (including icons already used by listings) or a path.
 * Submits into the `logoImage` field of the surrounding settings form.
 */
export default function BrandImageField({
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
  const urlId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setValue(await prepareImage(file, 512, 0.9));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Brand image</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Upload a square logo (PNG/SVG). It replaces the emoji mark in the header, footer and admin panel.
          </p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
          {value ? (
            <img src={value} alt="Brand logo preview" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-lg">🤖</span>
          )}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
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
        <div>
          <label className="label" htmlFor={urlId}>
            Image path or URL
          </label>
          <input
            id={urlId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="/brand/logo-256.webp or https://…"
            className="field !py-2 text-xs"
            spellCheck={false}
          />
        </div>
      </div>

      {media.length ? (
        <div className="mt-3">
          <p className="label">Or pick an uploaded image</p>
          <div className="mt-1 grid max-h-40 grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-line bg-white p-2 sm:grid-cols-8">
            {media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setValue(item.url)}
                title={item.name}
                className={`rounded-lg border p-1 transition ${
                  value === item.url ? "border-indigo-500 ring-2 ring-indigo-100" : "border-line hover:border-indigo-300"
                }`}
              >
                <img src={item.url} alt={item.name} className="h-10 w-full object-contain" />
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] text-muted">
            Includes icons already used by AI and app listings.{" "}
            <Link href="/admin/media" className="font-semibold text-brand hover:underline">
              Open media library
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          No uploaded images yet — upload one above, or add more in the{" "}
          <Link href="/admin/media" className="font-semibold text-brand hover:underline">
            media library
          </Link>
          .
        </p>
      )}

      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
      {busy ? <p className="mt-2 text-xs text-muted">Preparing the image…</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setValue("")} className="btn btn-ghost !py-1 text-[11px]">
          Use default mark
        </button>
        <span className="text-[10.5px] text-muted">
          {value ? "Header and footer will show this image." : "Header and footer use the default GiggleNode mark."}
        </span>
      </div>

      <input type="hidden" name="logoImage" value={value.trim()} />
    </div>
  );
}
