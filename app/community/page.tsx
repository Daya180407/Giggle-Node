import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AiLogo } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import {
  allowedCommunityKinds,
  communityMemberCounts,
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

type ChatRow = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  members: number;
  count: number;
  lastAt: string | null;
  avatar: ReactNode;
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

export default async function CommunityIndexPage() {
  sweepCommunityMessages();

  const db = readDb();
  const settings = getSiteSettings(db);
  const community = settings.community;
  const view = buildView(db);
  const summary = communityRoomSummary(db);
  const memberCounts = communityMemberCounts(db);
  const totals = communityTotals(db);
  const kinds = allowedCommunityKinds(community);
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
      members: memberCounts.get(pinned.key) ?? 0,
      count: pinnedStats.count,
      lastAt: pinnedStats.lastAt,
      avatar: (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 text-xl text-white shadow-sm">
          🌍
        </span>
      ),
    },
    ...customRooms.map(({ room, ai, stats, last }) => {
      const key = roomSummaryKey(room.aiId, room.id);
      return {
        key: room.id,
        href: `/community/${room.slug}`,
        title: room.title,
        subtitle: last
          ? messagePreview(last).slice(0, 90)
          : `${ai.name} · ${categoryName(ai.category)} · topic room`,
        members: memberCounts.get(key) ?? 0,
        count: stats.count,
        lastAt: stats.lastAt,
        avatar: <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={48} rounded="rounded-full" />,
        topic: true,
      };
    }),
    ...aiRooms.map(({ stat, stats, last }) => {
      const key = roomSummaryKey(stat.ai.id, null);
      return {
        key: stat.ai.id,
        href: `/community/${stat.ai.slug}`,
        title: `${stat.ai.name} community`,
        subtitle: last ? messagePreview(last).slice(0, 90) : `${categoryName(stat.ai.category)} · be the first to post`,
        members: memberCounts.get(key) ?? 0,
        count: stats.count,
        lastAt: stats.lastAt,
        avatar: <AiLogo slug={stat.ai.slug} logo={stat.ai.logo} color={stat.ai.color} size={48} rounded="rounded-full" />,
      };
    }),
  ];
  // Most members first, so the busiest community sits at the top of the list.
  const rows = allRows.sort((a, b) => {
    if (b.members !== a.members) return b.members - a.members;
    const aTime = a.lastAt ? +new Date(a.lastAt) : 0;
    const bTime = b.lastAt ? +new Date(b.lastAt) : 0;
    return bTime - aTime || a.title.localeCompare(b.title);
  });

  return (
    <div data-community-shell="" className="w-full">
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden border-y border-[#d1d7db] bg-white">
        <header className="bg-[#075e54] px-3 pb-3 pt-4 text-white sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">GigleNode</p>
              <h1 className="mt-1 text-2xl font-extrabold leading-none">Community</h1>
              <p className="mt-1.5 text-[11.5px] leading-snug text-white/75">
                {rows.length} {rows.length === 1 ? "community" : "communities"} ·{" "}
                {totals.members.toLocaleString("en-IN")} {totals.members === 1 ? "member" : "members"} · joined
                members can post
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-semibold text-white">
              {totals.messages.toLocaleString("en-IN")} messages
            </span>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#e9edef] bg-[#fdf4c5]/70 px-3 py-2 text-[10.5px] leading-snug text-[#54656f] sm:px-4">
          <span>🔒 Free for every member</span>
          <span aria-hidden>·</span>
          <span>auto-delete after {community.retentionDays} days</span>
          {kinds.length ? (
            <>
              <span aria-hidden>·</span>
              <span>share {kinds.map((kind) => KIND_LABELS[kind].toLowerCase()).join(", ")}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span>ads stay inline, never a popup</span>
        </div>

        {!community.enabled ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-center">
            <div>
              <p className="text-sm font-bold text-ink">Community is paused</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
                The administrator has switched the community off for now. You can still browse AI ratings and prompts
                while it is closed.
              </p>
              <Link href="/category/all" className="btn btn-ghost mt-3 !py-1.5 text-xs">
                Browse AI rankings
              </Link>
            </div>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-[#e9edef]">
            {rows.map((row) => (
              <li key={row.key}>
                <Link href={row.href} className="flex items-center gap-3 px-3 py-3 transition hover:bg-[#f5f6f6] sm:px-4">
                  {row.avatar}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[14.5px] font-semibold text-[#111b21]">{row.title}</p>
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
                    <span className="text-[10.5px] font-semibold text-[#0b7d6b]">
                      👥 {row.members.toLocaleString("en-IN")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
