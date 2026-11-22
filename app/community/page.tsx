import Link from "next/link";
import type { Metadata } from "next";
import { AiLogo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import {
  allowedCommunityKinds,
  communityRoomSummary,
  communityRoomsFor,
  communityTotals,
  KIND_LABELS,
  roomSummaryKey,
  sweepCommunityMessages,
} from "@/lib/community-chat";
import { buildView, rankedAis, timeAgo, trendingAis } from "@/lib/rank";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Community — Ask, Share and Help on Every AI Tool",
  description:
    "Join the GigleNode community for each AI tool. Share problems, ideas, tips, screenshots, voice notes and files with other users. Free to join, messages clean up automatically.",
  alternates: { canonical: "/community" },
};

type Props = { searchParams: Promise<{ q?: string }> };

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

  const trending = trendingAis(view, 6, settings.trendingAiIds);
  const query = q.trim().toLowerCase();
  const customRooms = communityRoomsFor(db)
    .filter((room) => !room.hidden)
    .flatMap((room) => {
      const ai = db.ai.find((row) => row.id === room.aiId && !row.hidden);
      if (!ai) return [];
      return [{ room, ai, stats: summary.get(roomSummaryKey(room.aiId, room.id)) ?? { count: 0, lastAt: null } }];
    })
    .filter((entry) => {
      if (!query) return true;
      return [entry.room.title, entry.room.description, entry.ai.name, categoryName(entry.ai.category)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      const aTime = a.stats.lastAt ? +new Date(a.stats.lastAt) : 0;
      const bTime = b.stats.lastAt ? +new Date(b.stats.lastAt) : 0;
      return bTime - aTime || +new Date(b.room.createdAt) - +new Date(a.room.createdAt);
    });
  const rooms = rankedAis(view)
    .map((stat) => ({
      stat,
      room: summary.get(stat.ai.id) ?? { count: 0, lastAt: null },
    }))
    .filter(({ stat }) => {
      if (!query) return true;
      return [stat.ai.name, stat.ai.description, stat.ai.category, categoryName(stat.ai.category), stat.ai.bestFor.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      const aTime = a.room.lastAt ? +new Date(a.room.lastAt) : 0;
      const bTime = b.room.lastAt ? +new Date(b.room.lastAt) : 0;
      return bTime - aTime || b.stat.trendingScore - a.stat.trendingScore;
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="page-hero">
        <p className="eyebrow">Community</p>
        <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-tight text-ink">
          A room for every AI tool
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Pick an AI, then ask a question, share a problem, post an idea or help someone else. Every room is free for
          signed-in members. Messages older than {community.retentionDays} days are deleted automatically, so rooms stay
          useful and light.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-slate-100 text-slate-600">{rooms.length} rooms</span>
          {customRooms.length ? (
            <span className="chip bg-violet-50 text-violet-700">{customRooms.length} topic rooms</span>
          ) : null}
          <span className="chip bg-indigo-50 text-indigo-700">{totals.messages} messages</span>
          <span className="chip bg-emerald-50 text-emerald-700">
            Free · auto-delete after {community.retentionDays} days
          </span>
          {kinds.length ? (
            <span className="chip bg-slate-100 text-slate-600">
              Share: {kinds.map((kind) => KIND_LABELS[kind]).join(" · ")}
            </span>
          ) : null}
        </div>
      </header>

      {!community.enabled ? (
        <div className="card mt-4 border-amber-200 bg-amber-50/70 p-5">
          <h2 className="text-sm font-bold text-amber-900">Community is paused</h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            The administrator has switched the community off for now. You can still browse AI ratings and prompts while
            it is closed.
          </p>
          <Link href="/category/all" className="btn btn-ghost mt-3 !py-1.5 text-xs">
            Browse AI rankings
          </Link>
        </div>
      ) : (
        <>
          <form className="card mt-4 flex flex-wrap items-center gap-2 p-3" action="/community">
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Find a room by AI name or category…"
              className="field min-w-[220px] flex-1 !py-2 text-sm"
              aria-label="Search community rooms"
            />
            <button className="btn btn-primary !py-2 text-xs">Search</button>
            {q ? (
              <Link href="/community" className="btn btn-ghost !py-2 text-xs">
                Reset
              </Link>
            ) : null}
            <span className="ml-auto text-[11px] text-muted">{rooms.length} rooms</span>
          </form>

          {trending.length > 0 && !query ? (
            <section className="mt-5">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="eyebrow">Busy right now</p>
                  <h2 className="display mt-1 text-xl text-ink">Trending AI rooms</h2>
                </div>
                <Link href="/category/all" className="text-xs font-semibold text-brand">
                  All rankings →
                </Link>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trending.map((stat) => {
                  const room = summary.get(stat.ai.id) ?? { count: 0, lastAt: null };
                  return (
                    <Link
                      key={stat.ai.id}
                      href={`/community/${stat.ai.slug}`}
                      className="card group flex items-start gap-3 p-4 transition hover:border-brand/40 hover:shadow-md"
                    >
                      <AiLogo slug={stat.ai.slug} logo={stat.ai.logo} color={stat.ai.color} size={44} rounded="rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink group-hover:text-brand">{stat.ai.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">{categoryName(stat.ai.category)}</p>
                        <p className="mt-1.5 text-[11px] font-semibold text-slate-600">
                          💬 {room.count} {room.count === 1 ? "message" : "messages"}
                        </p>
                        <p className="text-[10.5px] text-muted">
                          {room.lastAt ? `Active ${timeAgo(room.lastAt)}` : "No messages yet — start the room"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {customRooms.length ? (
            <section className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="eyebrow">Special rooms</p>
                  <h2 className="display mt-1 text-xl text-ink">Topic rooms</h2>
                </div>
                <span className="chip bg-slate-100 text-slate-600">{customRooms.length} rooms</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customRooms.map(({ room, ai, stats }) => (
                  <Link
                    key={room.id}
                    href={`/community/${room.slug}`}
                    className="card group p-4 transition hover:border-brand/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={32} rounded="rounded-lg" />
                      <span className="truncate text-[11px] font-semibold text-slate-600">{ai.name}</span>
                      <span className="ml-auto text-[10px] text-muted">{categoryName(ai.category)}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-ink group-hover:text-brand">{room.title}</p>
                    {room.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-600">{room.description}</p>
                    ) : null}
                    <p className="mt-1.5 text-[10.5px] text-muted">
                      💬 {stats.count} {stats.count === 1 ? "message" : "messages"}
                      {stats.lastAt ? ` · active ${timeAgo(stats.lastAt)}` : " · be the first to post"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="eyebrow">Every AI</p>
                <h2 className="display mt-1 text-xl text-ink">Choose a room</h2>
              </div>
              <span className="chip bg-slate-100 text-slate-600">{rooms.length} rooms</span>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map(({ stat, room }) => (
                <Link
                  key={stat.ai.id}
                  href={`/community/${stat.ai.slug}`}
                  className="card flex items-center gap-3 p-3 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  <AiLogo slug={stat.ai.slug} logo={stat.ai.logo} color={stat.ai.color} size={38} rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{stat.ai.name}</p>
                    <p className="truncate text-[10.5px] text-muted">
                      {categoryName(stat.ai.category)} · {room.count} {room.count === 1 ? "message" : "messages"}
                    </p>
                  </div>
                  <span aria-hidden className="text-slate-300">
                    →
                  </span>
                </Link>
              ))}
            </div>

            {rooms.length === 0 ? (
              <div className="card mt-3 p-8 text-center">
                <p className="text-sm font-semibold text-ink">No room matches that search.</p>
                <Link href="/community" className="btn btn-ghost mt-3 text-xs">
                  Show every room
                </Link>
              </div>
            ) : null}
          </section>

          {!user ? (
            <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-bold text-ink">Join the conversation</p>
                <p className="mt-0.5 text-xs text-muted">
                  Posting is free. Log in once and your account works in every room.
                </p>
              </div>
              <Link href="/login?next=%2Fcommunity" className="btn btn-primary !py-2 text-xs">
                Log in to post
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
