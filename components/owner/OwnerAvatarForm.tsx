"use client";

import { useState } from "react";
import { removeOwnerAvatarAction, saveOwnerAvatarAction } from "@/app/owner-actions";

const MAX_SIDE = 512;

/** Downscales the picked picture in the browser so only a small JPEG is uploaded. */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function OwnerAvatarForm({ src, initials }: { src: string; initials: string }) {
  const [dataUrl, setDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {dataUrl || src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl || src}
            alt="Profile picture"
            className="h-16 w-16 rounded-2xl border border-line object-cover"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-lg font-extrabold text-brand">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Profile picture</p>
          <p className="text-[11px] text-muted">Square image, resized to 512px before upload.</p>
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <form action={saveOwnerAvatarAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="dataUrl" value={dataUrl} />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="field !w-auto !py-1.5 text-xs"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              setDataUrl(await compress(file));
            } catch {
              setError("That file could not be read. Try a JPG or PNG.");
            } finally {
              setBusy(false);
            }
          }}
        />
        <button className="btn btn-primary !py-1.5 text-xs" disabled={busy || !dataUrl}>
          {busy ? "Preparing…" : "Save picture"}
        </button>
      </form>

      {src ? (
        <form action={removeOwnerAvatarAction}>
          <button className="text-[11px] font-semibold text-rose-600 hover:underline">Remove picture</button>
        </form>
      ) : null}
    </div>
  );
}
