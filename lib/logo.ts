/**
 * A tool logo is one string in `Ai.logo`, but it can hold three things:
 *  - a short emoji ("🤖"),
 *  - an image (media-library data URL, /path or https URL),
 *  - a hand-written inline SVG ("<svg …>").
 * These helpers are pure so the admin form, bulk import and the public
 * component all read a stored value the same way.
 */

export type LogoKind = "emoji" | "image" | "svg";

const MAX_IMAGE_LENGTH = 900_000;
const MAX_SVG_LENGTH = 20_000;
const MAX_EMOJI_LENGTH = 12;

const IMAGE_SOURCE = /^(?:data:image\/(?:png|jpe?g|webp|gif|svg\+xml)[;,][\s\S]*|\/|https?:\/\/)/i;
const SVG_START = /^<svg[\s>]/i;

/** How a stored logo value should be drawn. */
export function logoKind(value: string | null | undefined): LogoKind {
  const raw = (value ?? "").trim();
  if (SVG_START.test(raw)) return "svg";
  if (IMAGE_SOURCE.test(raw)) return "image";
  return "emoji";
}

/** Keep an inline SVG, minus the parts that could run code or load remote art. */
export function sanitizeSvgLogo(value: string): string {
  let svg = value.trim();
  if (!svg || svg.length > MAX_SVG_LENGTH) return "";

  // Drop whole elements that can execute or embed: scripts, styles, iframes,
  // foreignObject, media and <image> (which can point at remote URLs).
  svg = svg
    .replace(
      /<\s*(script|style|foreignObject|iframe|object|embed|image|audio|video)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|style|foreignObject|iframe|object|embed|image|audio|video)\b[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, (match, quoted: string) =>
      /^\s*["']\s*#/.test(quoted) ? match : "",
    )
    .replace(/javascript:/gi, "");

  if (!svg.toLowerCase().startsWith("<svg") || !/<\/svg>\s*$/i.test(svg)) return "";
  // A pasted fragment often misses the namespace; without it the browser will
  // not render the markup when it is injected with innerHTML.
  if (!/\sxmlns\s*=/i.test(svg)) svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}

/**
 * Clean a logo submitted from a form or CSV. Returns "" when the value is not
 * usable, so callers can fall back to their default emoji.
 */
export function normalizeAiLogo(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const kind = logoKind(raw);
  if (kind === "svg") return sanitizeSvgLogo(raw);
  if (kind === "image") return raw.length <= MAX_IMAGE_LENGTH ? raw : "";
  // Some other markup (HTML, a broken svg) must not turn into visible tag text.
  if (raw.startsWith("<")) return "";
  return raw
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim()
    .slice(0, MAX_EMOJI_LENGTH);
}
