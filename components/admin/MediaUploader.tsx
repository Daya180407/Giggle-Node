"use client";

import { useState } from "react";
import { saveMediaAction } from "@/app/actions";

type Prepared = {
  dataUrl: string;
  name: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = src;
  });
}

export default function MediaUploader() {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    setPrepared(null);
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
      const bytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
      setPrepared({
        dataUrl,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "image",
        mime: "image/jpeg",
        bytes,
        width,
        height,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process that image.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setBusy(false);
    }
  }

  return (
    <form action={saveMediaAction} className="card p-4 sm:p-5">
      <h3 className="text-sm font-bold">Upload an image</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Photos are resized to max 1200px and re-encoded as JPEG before saving, so pages stay fast. Logos work best with
        a square image.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="media-file">
            Image file
          </label>
          <input
            id="media-file"
            type="file"
            accept="image/*"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            className="field !py-2 text-xs"
          />
        </div>
        <button className="btn btn-primary !py-2 text-xs" disabled={!prepared || busy}>
          {busy ? "Compressing…" : "Save to library"}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}

      {prepared ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-slate-50/60 p-3">
          <img src={prepared.dataUrl} alt="Preview" className="h-16 w-16 rounded-lg border border-line object-cover" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold text-ink">{prepared.name}</p>
            <p className="text-muted">
              {prepared.width}×{prepared.height} · {Math.round(prepared.bytes / 1024)} KB after compression
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrepared(null)}
            className="btn btn-ghost !py-1.5 text-xs"
          >
            Remove
          </button>
        </div>
      ) : null}

      <input type="hidden" name="dataUrl" value={prepared?.dataUrl ?? ""} />
      <input type="hidden" name="name" value={prepared?.name ?? ""} />
      <input type="hidden" name="mime" value={prepared?.mime ?? "image/jpeg"} />
      <input type="hidden" name="bytes" value={prepared?.bytes ?? 0} />
      <input type="hidden" name="width" value={prepared?.width ?? 0} />
      <input type="hidden" name="height" value={prepared?.height ?? 0} />
    </form>
  );
}
