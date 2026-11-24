import { DESKTOP_GROUPS, DESKTOP_ROWS } from "./apps/desktop";
import { MOBILE_GROUPS, MOBILE_ROWS } from "./apps/mobile";
import type { AppEntry, AppGroup, AppKind, AppRow } from "./apps/types";

export type { AppEntry, AppGroup, AppKind };
export { DESKTOP_GROUPS, MOBILE_GROUPS };

const GROUP_META: Record<string, { color: string; emoji: string }> = {
  assistant: { color: "#4F46E5", emoji: "🤖" },
  writing: { color: "#0891B2", emoji: "✍️" },
  photo: { color: "#EC4899", emoji: "🖼️" },
  video: { color: "#EF4444", emoji: "🎬" },
  audio: { color: "#F59E0B", emoji: "🎙️" },
  work: { color: "#7C3AED", emoji: "📊" },
  utility: { color: "#0EA5E9", emoji: "🧰" },
  coding: { color: "#2563EB", emoji: "⌨️" },
  design: { color: "#A259FF", emoji: "🎨" },
  browser: { color: "#0F766E", emoji: "🌐" },
  developer: { color: "#111827", emoji: "🛠️" },
};

export const APP_GROUPS: AppGroup[] = [...MOBILE_GROUPS, ...DESKTOP_GROUPS];

/** Default colour and emoji for an app group, used when an admin adds a new app. */
export function appGroupMeta(group: string): { color: string; emoji: string } {
  return GROUP_META[group] ?? { color: "#4F46E5", emoji: "📱" };
}

function normalize(rows: AppRow[], kind: AppKind): AppEntry[] {
  return rows.map(([name, slug, group, price, website, note, aiSlug, platforms]) => ({
    name,
    slug,
    group,
    price,
    website,
    note,
    aiSlug: aiSlug || undefined,
    platforms: platforms.split(","),
    kind,
    color: GROUP_META[group]?.color ?? "#4F46E5",
    emoji: GROUP_META[group]?.emoji ?? "📱",
  }));
}

export const MOBILE_APPS = normalize(MOBILE_ROWS, "mobile");
export const DESKTOP_APPS = normalize(DESKTOP_ROWS, "desktop");
export const APP_ENTRIES: AppEntry[] = [...MOBILE_APPS, ...DESKTOP_APPS];

/** The built-in catalogue plus apps approved from user requests. */
export function allApps(custom?: AppEntry[] | null): AppEntry[] {
  return custom && custom.length ? [...APP_ENTRIES, ...custom] : APP_ENTRIES;
}
