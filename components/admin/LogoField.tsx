"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { logoKind, normalizeAiLogo, type LogoKind } from "@/lib/logo";

export type LogoMedia = { id: string; name: string; url: string };

const TABS: { key: LogoKind; label: string; hint: string }[] = [
  { key: "emoji", label: "Emoji", hint: "A single emoji. Used until an image is added below." },
  { key: "image", label: "Image / media", hint: "Pick an image from the library or upload one from this computer." },
  {
    key: "svg",
    label: "SVG code",
    hint: "Paste clean <svg> markup. Scripts, iframes and on* handlers are removed when you save.",
  },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = src;
  });
}

type PreparedLogo = { kind: "image" | "svg"; value: string };

async function prepareLogo(file: File): Promise<PreparedLogo> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

  // An uploaded SVG file becomes editable SVG code instead of a bitmap.
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    const svg = normalizeAiLogo(await file.text());
    if (!svg) throw new Error("That SVG is empty, too large (20 KB max) or not valid markup.");
    return { kind: "svg", value: svg };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const max = 512;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser");
    // Keep transparency for PNG/WebP/GIF marks; flatten everything else on white.
    const keepAlpha = /png|webp|gif/i.test(file.type);
    if (!keepAlpha) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const value = keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86);
    // The logo travels inside the form post, so keep it well under the action limit.
    if (value.length > 700_000) throw new Error("That logo is still too large after resizing. Try a simpler image.");
    return { kind: "image", value };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Logo editor for an AI listing: emoji, an image from the media library (or a
 * fresh upload) or pasted SVG code. Everything lands in the single `logo` field.
 */
export default function LogoField({
  defaultValue,
  media,
  name = "logo",
  label = "Logo",
}: {
  defaultValue: string;
  media: LogoMedia[];
  /** form field name; apps store their icon in `emoji` */
  name?: string;
  label?: string;
}) {
  const initialKind = logoKind(defaultValue);
  const [mode, setMode] = useState<LogoKind>(initialKind);
  const [emoji, setEmoji] = useState(initialKind === "emoji" ? defaultValue : "🤖");
  const [image, setImage] = useState(initialKind === "image" ? defaultValue : "");
  const [svg, setSvg] = useState(initialKind === "svg" ? defaultValue : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileId = useId();
  const emojiId = useId();
  const svgId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareLogo(file);
      if (prepared.kind === "svg") {
        setSvg(prepared.value);
        setMode("svg");
      } else {
        setImage(prepared.value);
        setMode("image");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process that image.");
    } finally {
      setBusy(false);
    }
  }

  const value = mode === "emoji" ? emoji : mode === "image" ? image : svg;
  const preview = value.trim() || "🤖";
  const previewKind = logoKind(preview);
  const activeHint = TABS.find((tab) => tab.key === mode)?.hint ?? "";

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              aria-pressed={mode === tab.key}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                mode === tab.key
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "emoji" ? (
        <div className="mt-2">
          <label className="label" htmlFor={emojiId}>
            Emoji
          </label>
          <input
            id={emojiId}
            value={emoji}
            onChange={(event) => setEmoji(event.target.value)}
            maxLength={12}
            className="field !w-24 text-center text-lg"
            placeholder="🤖"
          />
        </div>
      ) : null}

      {mode === "image" ? (
        <div className="mt-2 space-y-2">
          <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line bg-white p-2 sm:grid-cols-6">
            {media.length ? (
              media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImage(item.url)}
                  title={item.name}
                  className={`rounded-lg border p-1 text-left transition ${
                    image === item.url
                      ? "border-indigo-500 ring-2 ring-indigo-100"
                      : "border-line hover:border-indigo-300"
                  }`}
                >
                  <img src={item.url} alt={item.name} className="h-12 w-full object-contain" />
                  <span className="mt-1 block truncate text-[9.5px] text-muted">{item.name}</span>
                </button>
              ))
            ) : (
              <p className="col-span-full px-2 py-3 text-[11px] leading-relaxed text-muted">
                No images in the media library yet. Upload one below, or add a few in{" "}
                <Link href="/admin/media" className="font-semibold text-brand hover:underline">
                  Media library
                </Link>
                .
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor={fileId}>
              Upload from this computer
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*,.svg"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              className="field !py-2 text-xs"
            />
          </div>

          {image ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-slate-50/70 p-2">
              <img src={image} alt="Selected logo" className="h-10 w-10 rounded-md border border-line bg-white object-contain" />
              <p className="text-[11px] text-muted">Selected image will be saved as the logo.</p>
              <button
                type="button"
                onClick={() => setImage("")}
                className="btn btn-ghost ml-auto !py-1 text-[11px]"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "svg" ? (
        <div className="mt-2">
          <label className="label" htmlFor={svgId}>
            SVG markup (20 KB max)
          </label>
          <textarea
            id={svgId}
            value={svg}
            onChange={(event) => setSvg(event.target.value)}
            rows={6}
            spellCheck={false}
            className="field font-mono text-[11px]"
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'}
          />
          <p className="mt-1 text-[11px] text-muted">
            Square viewBox works best. Pasted markup is cleaned on save, so scripts and external links are dropped.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
      {busy ? <p className="mt-2 text-xs text-muted">Preparing the image…</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
        <span
          className="ai-logo grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white"
          aria-hidden
        >
          {previewKind === "image" ? (
            <img src={preview} alt="" className="h-full w-full object-contain p-1" />
          ) : previewKind === "svg" ? (
            <span className="block h-full w-full" dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <span style={{ fontSize: 24, lineHeight: 1 }}>{preview}</span>
          )}
        </span>
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted">{activeHint}</p>
        <button
          type="button"
          onClick={() => {
            setEmoji("🤖");
            setImage("");
            setSvg("");
            setError(null);
            setMode("emoji");
          }}
          className="btn btn-ghost !py-1 text-[11px]"
        >
          Reset to 🤖
        </button>
      </div>

      <input type="hidden" name={name} value={value.trim() || "🤖"} />
    </div>
  );
}
