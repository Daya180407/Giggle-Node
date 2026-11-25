"use client";

import { useState } from "react";
import { saveAppAction } from "@/app/actions";
import { AiLogo } from "@/components/ui";
import { DESKTOP_GROUPS, MOBILE_GROUPS } from "@/lib/software";
import type { AppEntry } from "@/lib/apps/types";

/**
 * Add or edit a catalogue app / desktop tool. Unlike an AI listing this entry
 * needs no models of its own — it can point at another AI's API, or stand alone,
 * and it can carry an affiliate link used by the public card.
 */
export default function AppForm({
  entry,
  ais,
}: {
  entry?: AppEntry | null;
  ais: { slug: string; name: string }[];
}) {
  const [kind, setKind] = useState<"mobile" | "desktop">(entry?.kind ?? "mobile");
  const [group, setGroup] = useState(entry?.group ?? MOBILE_GROUPS[0].key);
  const [emoji, setEmoji] = useState(entry?.emoji ?? "📱");
  const [color, setColor] = useState(entry?.color ?? "#4F46E5");
  const [name, setName] = useState(entry?.name ?? "");

  const groups = kind === "mobile" ? MOBILE_GROUPS : DESKTOP_GROUPS;
  const groupMeta = groups.find((row) => row.key === group);

  function switchKind(next: "mobile" | "desktop") {
    setKind(next);
    setGroup(next === "mobile" ? MOBILE_GROUPS[0].key : DESKTOP_GROUPS[0].key);
  }

  return (
    <form action={saveAppAction} className="space-y-4">
      <input type="hidden" name="originalSlug" value={entry?.slug ?? ""} />

      <section className="card p-4">
        <h3 className="text-sm font-bold">App details</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              className="field"
              placeholder="e.g. Notion AI"
            />
          </div>
          <div>
            <label className="label" htmlFor="slug">
              Slug (optional)
            </label>
            <input
              id="slug"
              name="slug"
              defaultValue={entry?.slug ?? ""}
              maxLength={80}
              className="field"
              placeholder="auto from the name"
            />
          </div>
          <div>
            <label className="label" htmlFor="kind">
              Type
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) => switchKind(event.target.value === "desktop" ? "desktop" : "mobile")}
              className="field"
            >
              <option value="mobile">Mobile app</option>
              <option value="desktop">PC software</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="group">
              Group
            </label>
            <select
              id="group"
              name="group"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              className="field"
            >
              {groups.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="priceType">
              Price type
            </label>
            <select id="priceType" name="priceType" defaultValue={entry?.price ?? "freemium"} className="field">
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="platforms">
              Platforms
            </label>
            <input
              id="platforms"
              name="platforms"
              defaultValue={entry?.platforms.join(", ") ?? (kind === "mobile" ? "iOS,Android" : "Windows,macOS")}
              className="field"
              placeholder="iOS, Android"
            />
            <p className="mt-1 text-[11px] text-muted">Comma separated.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="note">
              Short note
            </label>
            <input
              id="note"
              name="note"
              defaultValue={entry?.note ?? ""}
              maxLength={140}
              className="field"
              placeholder="One line about what the app does."
            />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Links &amp; affiliate</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="website">
              Official website / store link
            </label>
            <input
              id="website"
              name="website"
              defaultValue={entry?.website ?? ""}
              required
              className="field"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="affiliateUrl">
              Affiliate link (optional)
            </label>
            <input
              id="affiliateUrl"
              name="affiliateUrl"
              defaultValue={entry?.affiliateUrl ?? ""}
              className="field"
              placeholder="https://partner.example.com/ref=gigglenode"
            />
            <p className="mt-1 text-[11px] text-muted">
              When set, the public card and Visit button open this link with a sponsored rel.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="aiSlug">
              Linked AI listing (optional)
            </label>
            <select id="aiSlug" name="aiSlug" defaultValue={entry?.aiSlug ?? ""} className="field">
              <option value="">Standalone — no AI rating page</option>
              {ais.map((ai) => (
                <option key={ai.slug} value={ai.slug}>
                  {ai.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              Apps that use another company&apos;s AI API usually stay standalone. Link an AI only when this app has
              its own rated listing.
            </p>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Icon</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-3">
            <AiLogo logo={emoji || "📱"} color={color} size={52} rounded="rounded-xl" />
            <div>
              <label className="label" htmlFor="emoji">
                Emoji / mark
              </label>
              <input
                id="emoji"
                name="emoji"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value.slice(0, 4))}
                className="field !w-28"
                maxLength={4}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="color">
              Accent colour
            </label>
            <input
              id="color"
              name="color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="field !h-10 !w-20 !p-1"
            />
          </div>
          <p className="max-w-sm text-[11px] leading-relaxed text-muted">
            Group default: {groupMeta?.label ?? group}. Upload a real icon on the app page after saving if you have
            one.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary text-xs">{entry ? "Save app" : "Add app"}</button>
        <a href="/admin/apps" className="btn btn-ghost text-xs">
          Cancel
        </a>
      </div>
    </form>
  );
}
