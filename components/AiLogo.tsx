"use client";

import { useState } from "react";
import { logoKind } from "@/lib/logo";

/**
 * Tool mark from the database. `logo` may be an emoji, an image (media-library
 * data URL, /path or https URL) or inline SVG. Older tools without a custom
 * logo fall back to /logos/<slug>.png and then to the emoji.
 */
export default function AiLogo({
  slug,
  src,
  logo,
  color,
  size = 44,
  rounded = "rounded-xl",
  className = "",
  alt = "",
}: {
  slug?: string;
  src?: string;
  logo: string;
  color: string;
  size?: number;
  rounded?: string;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const raw = (logo ?? "").trim();
  const kind = logoKind(raw);
  const imageSrc = src ?? (kind === "image" ? raw : kind === "emoji" && slug ? `/logos/${slug}.png` : undefined);
  const showImage = Boolean(imageSrc) && !failed;
  const showSvg = !showImage && kind === "svg";
  const pad = Math.max(3, Math.round(size * 0.13));

  return (
    <span
      className={`ai-logo inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${rounded} ${className}`}
      style={{
        width: size,
        height: size,
        padding: showImage ? pad : 0,
        border: `1px solid ${color}30`,
        boxShadow: `0 6px 16px -10px ${color}90, inset 0 0 0 1px rgb(255 255 255 / 0.8)`,
        fontSize: size * 0.46,
        lineHeight: 1,
      }}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : showSvg ? (
        <span className="block h-full w-full" aria-hidden dangerouslySetInnerHTML={{ __html: raw }} />
      ) : (
        <span aria-hidden>{raw}</span>
      )}
    </span>
  );
}
