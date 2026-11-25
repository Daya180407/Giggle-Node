import type { DB } from "./types";
import { logoKind } from "./logo";
import { allApps } from "./software";

export type LogoLibraryItem = { id: string; name: string; url: string };

/**
 * Everything an admin can reuse as an icon: the media library first, then every
 * image already used by an AI listing or an app. That way an icon uploaded once
 * shows up in the picker for every new listing instead of being uploaded again.
 */
export function catalogueLogos(db: DB): LogoLibraryItem[] {
  const rows: LogoLibraryItem[] = [];
  const seen = new Set<string>();
  const push = (id: string, name: string, value: string | null | undefined) => {
    const url = (value ?? "").trim();
    if (!url || logoKind(url) !== "image" || seen.has(url)) return;
    seen.add(url);
    rows.push({ id, name, url });
  };

  for (const item of db.media ?? []) push(item.id, item.name, item.url);
  for (const ai of db.ai) push(`ai:${ai.id}`, `${ai.name} logo`, ai.logo);
  for (const app of allApps(db.customApps)) push(`app:${app.slug}`, `${app.name} icon`, app.emoji);

  return rows;
}
