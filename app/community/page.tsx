import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AiLogo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import {
  allowedCommunityKinds,
  communityRoomSummary,
  communityRoomsFor,
  communityTotals,
  KIND_LABELS,
  messagePreview,
  roomSummaryKey,
  sweepCommunityMessages,
  universalRoom,
  UNIVERSAL_ROOM_SLUG,
} from "@/lib/community-chat";
import { buildView, rankedAis, timeAgo } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";
import type { CommunityMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Community — Ask, Share and Help on Every AI Tool",
  description:
    "Join the GigleNode community for each AI tool. Share problems, ideas, tips, screenshots, voice notes and files with other users. Free to join, messages clean up automatically.",
  alternates: { canonical: "/community" },
};

type Props = { searchParams: Promise<{ q?: string }> };

type ChatRow = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  count: number;
  lastAt: string | null;
  avatar: ReactNode;
  pinned?: boolean;
  topic?: boolean;
};

function lastMessages(db: ReturnType<typeof readDb>): Map<string, CommunityMessage> {
  const latest = new Map<string, CommunityMessage>();
  for (const message of db.communityMessages ?? []) {
    const key = roomSummaryKey(message.aiId, message.roomId);
    const current = latest.get(key);
    if (!current || +new Date(message.createdAt) > +new Date(current.createdAt)) latest.set(key, message);
  }
  return latest;
}

export default async function CommunityIndexPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  sweepCommunityMessages();

  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const settings = getSiteSettings(db);
  const community = settings.community;
  const view = buildView(db);
  const summary = communityRoomSummary(db);
  const totals = communityTotals(db);
  const kinds = allowedCommunityKinds(community);
  const query = q.trim().toLowerCase();
  const latest = lastMessages(db);

  const pinned = universalRoom();
  const pinnedStats = summary.get(pinned.key) ?? { count: 0, lastAt: null };
  const pinnedLatest = latest.get(pinned.key);

  const customRooms = communityRoomsFor(db)
    .filter((room) => !room.hidden)
    .flatMap((room) => {
      const ai = db.ai.find((row) => row.id === room.aiId && !row.hidden);
      if (!ai) return [];
      const stats = summary.get(roomSummaryKey(room.aiId, room.id)) ?? { count: 0, lastAt: null };
      const last = latest.get(roomSummaryKey(room.aiId, room.id));
      return [{ room, ai, stats, last }];
    });

  const aiRooms = rankedAis(view).map((stat) => {
    const key = roomSummaryKey(stat.ai.id, null);
    return {
      stat,
      stats: summary.get(key) ?? { count: 0, lastAt: null },
      last: latest.get(key),
    };
  });

  const allRows: ChatRow[] = [
    {
      key: pinned.key,
      href: `/community/${UNIVERSAL_ROOM_SLUG}`,
      title: "Everyone community",
      subtitle: pinnedLatest
        ? messagePreview(pinnedLatest).slice(0, 90)
        : "Open chat about any AI tool — its own room, separate from every AI room.",
      count: pinnedStats.count,
      lastAt: pinnedStats.lastAt,
      avatar: (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 text-xl text-white shadow-sm">
          🌍
        </span>
      ),
      pinned: true,
    },
    ...customRooms.map(({ room, ai, stats, last }) => ({
      key: room.id,
      href: `/community/${room.slug}`,
      title: room.title,
      subtitle: last
        ? messagePreview(last).slice(0, 90)
        : `${ai.name} · ${categoryName(ai.category)} · topic room`,
      count: stats.count,
      lastAt: stats.lastAt,
      avatar: <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={48} rounded="rounded-full" />,
      topic: true,
    })),
    ...aiRooms.map(({ stat, stats, last }) => ({
      key: stat.ai.id,
      href: `/community/${stat.ai.slug}`,
      title: `${stat.ai.name} community`,
      subtitle: last ? messagePreview(last).slice(0, 90) : `${categoryName(stat.ai.category)} · be the first to post`,
      count: stats.count,
      lastAt: stats.lastAt,
      avatar: (
        <AiLogo slug={stat.ai.slug} logo={stat.ai.logo} color={stat.ai.color} size={48} rounded="rounded-full" />
      ),
    })),
  ];
  const rows = allRows
    .filter((row) => {
      if (!query) return true;
      return `${row.title} ${row.subtitle}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (a.pinned) return -1;
      if (b.pinned) return 1;
      const aTime = a.lastAt ? +new Date(a.lastAt) : 0;
      const bTime = b.lastAt ? +new Date(b.lastAt) : 0;
      return bTime - aTime || a.title.localeCompare(b.title);
    });

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <header className="bg-[#075e54] px-4 pb-3 pt-4 text-white">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">GigleNode</p>
              <h1 className="mt-1 text-2xl font-extrabold leading-none">Community</h1>
              <p className="mt-1.5 text-[11.5px] leading-snug text-white/75">
                {1 + customRooms.length + aiRooms.length} chat rooms · free for every member · messages delete after{" "}
                {community.retentionDays} days
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-semibold text-white">
              {totals.messages.toLocaleString("en-IN")} messages
            </span>
          </div>

          <form className="mt-3 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm" action="/community">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0 text-[#8696a0]">
              <circle cx="8.5" cy="8.5" r="5.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.4 12.4L16.5 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Search a room by AI name or topic…"
              className="min-w-0 flex-1 bg-transparent py-0.5 text-[13px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
              aria-label="Search community rooms"
            />
            <button className="rounded-full bg-[#00a884] px-3 py-1 text-[11px] font-semibold text-white">Search</button>
          </form>
          {q ? (
            <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-white/75">
              <span>
                {rows.length} {rows.length === 1 ? "room" : "rooms"} for “{q}”
              </span>
              <Link href="/community" className="font-semibold text-white underline underline-offset-2">
                Clear
              </Link>
            </div>
          ) : null}
        </header>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#e9edef] bg-[#fdf4c5]/70 px-4 py-2 text-[10.5px] leading-snug text-[#54656f]">
          <span>🔒 Free and non-popup</span>
          <span aria-hidden>·</span>
          <span>auto-delete after {community.retentionDays} days</span>
          {kinds.length ? (
            <>
              <span aria-hidden>·</span>
              <span>share {kinds.map((kind) => KIND_LABELS[kind].toLowerCase()).join(", ")}</span>
            </>
          ) : null}
        </div>

        {!community.enabled ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-bold text-ink">Community is paused</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
              The administrator has switched the community off for now. You can still browse AI ratings and prompts
              while it is closed.
            </p>
            <Link href="/category/all" className="btn btn-ghost mt-3 !py-1.5 text-xs">
              Browse AI rankings
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-ink">No room matches that search.</p>
            <Link href="/community" className="btn btn-ghost mt-3 !py-1.5 text-xs">
              Show every room
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#e9edef]">
            {rows.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className={`flex items-center gap-3 px-3 py-2.5 transition hover:bg-[#f5f6f6] sm:px-4 ${
                    row.pinned ? "bg-[#f7f8fa]" : ""
                  }`}
                >
                  {row.avatar}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[14px] font-semibold text-[#111b21]">{row.title}</p>
                      {row.pinned ? (
                        <span className="rounded-full bg-[#d9fdd3] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#075e54]">
                          📌 Pinned
                        </span>
                      ) : null}
                      {row.topic ? (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          Topic
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-snug text-[#667781]">{row.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-[#667781]">{row.lastAt ? timeAgo(row.lastAt) : "New"}</span>
                    {row.count > 0 ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#25d366] px-1.5 text-[10px] font-bold text-white">
                        {row.count > 99 ? "99+" : row.count}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!user ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[13px] font-bold text-ink">Join the conversation</p>
            <p className="mt-0.5 text-[11.5px] text-muted">Posting is free and your account works in every room.</p>
          </div>
          <Link href="/login?next=%2Fcommunity" className="btn btn-primary !py-2 text-xs">
            Log in to post
          </Link>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
        <Link href="/category/all" className="font-semibold text-brand">
          Browse AI rankings →
        </Link>
        <span>Ads stay inline in chat — never a popup.</span>
      </div>
    </div>
  );
}
