import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { deleteCommunityMessageAction, joinCommunityAction, reportCommunityMessageAction } from "@/app/actions";
import ChatSponsoredAd from "@/components/ChatSponsoredAd";
import CommunityAd from "@/components/CommunityAd";
import CommunityChatScroll from "@/components/CommunityChatScroll";
import CommunityComposer from "@/components/CommunityComposer";
import OfficialTick from "@/components/OfficialTick";
import { AiLogo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import {
  allowedCommunityKinds,
  communityBanFor,
  communityMemberCount,
  communityMessagesForRoom,
  findCommunityRoom,
  humanBytes,
  isCommunityMember,
  KIND_LABELS,
  REPORT_REASONS,
  sweepCommunityMessages,
} from "@/lib/community-chat";
import { chatAdCreative, chatAdForSlot, liveChatAds } from "@/lib/ads";
import { buildView } from "@/lib/rank";
import { isStaffRole, resolveRoles } from "@/lib/roles";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reported?: string; banned?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = readDb();
  const found = findCommunityRoom(db, slug);
  if (!found) return { title: "Community room not found" };
  const { ai, room } = found;
  return {
    title: `${room.title} — Ask, Share & Help`,
    description:
      room.description ||
      `The GigleNode community room for ${ai?.name ?? "any AI tool"}. Share problems, ideas, tips, screenshots, voice notes and files with other users. Free to join.`,
    alternates: { canonical: `/community/${room.slug}` },
  };
}

const CLOCK = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function clockTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : CLOCK.format(date);
}

const SENDER_TONES = ["#0b7d6b", "#8e44ad", "#b45309", "#1d4ed8", "#be123c", "#0f766e", "#6d28d9"];

function senderTone(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) | 0;
  return SENDER_TONES[Math.abs(hash) % SENDER_TONES.length];
}

function DeliveredTicks() {
  return (
    <svg width="15" height="11" viewBox="0 0 16 12" fill="none" aria-hidden className="shrink-0 text-[#53bdeb]">
      <path d="M1 6.5l2.6 2.6L9 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 9.1l.6.6 6.2-6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function CommunityRoomPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { reported, banned: bannedNotice } = await searchParams;
  sweepCommunityMessages();

  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const found = findCommunityRoom(db, slug);
  if (!found) notFound();
  const { ai, room } = found;
  // Official profiles: the site team (admin role or a giglenode.com mailbox).
  // Seeded demo messages carry the flag themselves.
  const officialUserIds = new Set(
    db.users
      .filter((row) => row.role === "admin" || row.email.toLowerCase().endsWith("@giglenode.com"))
      .map((row) => row.id),
  );

  const settings = getSiteSettings(db);
  const community = settings.community;
  const kinds = allowedCommunityKinds(community);
  const roomMessages = communityMessagesForRoom(db, room.aiId, room.roomId);
  const messages = roomMessages.slice(-100);
  const memberCount = communityMemberCount(db, room.aiId, room.roomId);
  const joined = user ? isCommunityMember(db, user.id, room.aiId, room.roomId) : false;
  const stat = ai ? buildView(db).aiStats.get(ai.id) : undefined;
  const staff = user ? isStaffRole(user.role, resolveRoles(db.roles)) : false;
  const ban = user ? communityBanFor(db, user.id, room.aiId, room.roomId) : null;
  const back = `/community/${room.slug}`;
  // Paid chat campaigns share the slot with AdSense/house ads. A live campaign
  // wins the slot; when its bought views run out it disappears automatically.
  const sponsoredAds = community.adsEnabled ? liveChatAds(db) : [];
  let chatAdSlot = 0;

  const adsReady = settings.adsEnabled && /^ca-pub-\d{16}$/.test(settings.adsClientId);
  const clientId = community.adsEnabled && adsReady ? settings.adsClientId : "";
  const topSlot = community.adsEnabled ? community.adTopSlot || settings.adsTopSlot : "";
  const inlineSlot = community.adsEnabled ? community.adInlineSlot || settings.adsArticleSlot : "";
  const houseText = community.adsEnabled ? community.houseAdText : "";
  const houseHref = community.adsEnabled ? community.houseAdHref : "";
  // One inline ad after every N messages (admin setting, default 20).
  const adEvery = Math.max(3, Math.min(50, community.adEvery || 20));

  return (
    <div data-community-shell="" className="w-full">
      <div className="chat-shell chat-shell-full flex h-[calc(100dvh-4rem)] flex-col">
        <header className="flex items-center gap-2 bg-[#075e54] px-2 py-2 text-white sm:px-3">
          <Link
            href="/community"
            aria-label="Back to community rooms"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12.5 4L6.5 10l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {ai ? (
            <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={40} rounded="rounded-full" />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-xl">🌍</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold leading-tight">{room.title}</h1>
            <p className="truncate text-[12.5px] leading-tight text-white/75">
              {ai ? `${ai.name} · ${categoryName(ai.category)} · ` : "Any AI tool · "}
              {memberCount.toLocaleString("en-IN")} {memberCount === 1 ? "member" : "members"}
              {stat ? ` · ${stat.score.toFixed(1)}★` : ""}
            </p>
          </div>
          <Link
            href={ai ? `/ai/${ai.slug}` : "/community"}
            aria-label={ai ? `Open ${ai.name} page` : "Community rooms"}
            title={ai ? `Open ${ai.name} page` : "Community rooms"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="10" r="7.4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9v4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="10" cy="6.4" r="0.9" fill="currentColor" />
            </svg>
          </Link>
        </header>

        <p className="border-b border-[#e6d98f] bg-[#fdf4c5] px-3 py-1.5 text-center text-[12px] leading-snug text-[#54656f]">
          🔒 Free for every signed-in member · messages delete after {community.retentionDays} days
        </p>

        {reported === "1" ? (
          <p className="border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center text-[12px] font-medium text-emerald-800">
            Report sent to the moderators. Thank you — they will review the message.
          </p>
        ) : null}
        {reported === "self" ? (
          <p className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[12px] font-medium text-amber-800">
            You can delete your own message instead of reporting it.
          </p>
        ) : null}
        {bannedNotice === "1" ? (
          <p className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-center text-[12px] font-medium text-rose-700">
            Your account is banned from joining this community.
          </p>
        ) : null}

        {community.enabled ? (
          ban ? (
            <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 sm:px-4">
              <p className="text-[13.5px] font-semibold text-rose-800">
                You are banned from posting in {room.title}.
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-rose-700">
                {ban.reason}
                {ban.until ? ` · until ${ban.until}` : " · permanent"}. You can still read the room; contact the site
                team if you think this is a mistake.
              </p>
            </div>
          ) : user ? (
            joined ? null : (
              <form
                action={joinCommunityAction}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8e5df] bg-[#e7f8f1] px-3 py-2 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug text-[#111b21]">
                    Join {room.title} to send messages
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#54656f]">
                    {memberCount.toLocaleString("en-IN")} {memberCount === 1 ? "member" : "members"} · free to join,
                    leave anytime
                  </p>
                </div>
                <input type="hidden" name="aiId" value={room.aiId} />
                {room.roomId ? <input type="hidden" name="roomId" value={room.roomId} /> : null}
                <input type="hidden" name="back" value={back} />
                <button className="rounded-full bg-[#00a884] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#008f72]">
                  Join community
                </button>
              </form>
            )
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8e5df] bg-[#e7f8f1] px-3 py-2 sm:px-4">
              <p className="text-[13px] leading-snug text-[#54656f]">
                Log in free to join this chat.{" "}
                <span className="font-semibold text-[#111b21]">
                  {memberCount.toLocaleString("en-IN")} {memberCount === 1 ? "member" : "members"}
                </span>{" "}
                already here.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(back)}`}
                className="rounded-full bg-[#00a884] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#008f72]"
              >
                Log in to join
              </Link>
            </div>
          )
        ) : null}

        <CommunityChatScroll>
          <div className="mx-auto w-full max-w-4xl">
            {messages.map((message, index) => {
              const own = user?.id === message.userId;
              const official = Boolean(message.official) || officialUserIds.has(message.userId);
              const showName = !own || official;
              return (
                <div key={message.id} className="mb-2">
                  <div className={`flex items-end gap-1.5 ${own ? "justify-end" : "justify-start"}`}>
                    {own ? null : (
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-[12px] font-bold text-white shadow-sm"
                        aria-hidden
                      >
                        {message.avatar || message.userName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <article
                      className={`max-w-[86%] px-2.5 pb-1 pt-1.5 sm:max-w-[72%] ${
                        own ? "chat-bubble-out" : "chat-bubble-in"
                      }`}
                    >
                      {showName ? (
                        <p
                          className="flex items-center gap-1 text-[13.5px] font-semibold leading-tight"
                          style={{ color: senderTone(message.userId) }}
                        >
                          <span className="truncate">{message.userName}</span>
                          {official ? <OfficialTick /> : null}
                        </p>
                      ) : null}

                      {message.body ? (
                        <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-[1.45] text-[#111b21]">
                          {message.body}
                        </p>
                      ) : null}

                      {message.attachment && message.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.attachment.dataUrl}
                          alt={message.attachment.name}
                          loading="lazy"
                          className="mt-1 max-h-64 w-auto rounded-lg border border-black/5"
                        />
                      ) : null}

                      {message.attachment && message.kind === "voice" ? (
                        <audio controls preload="none" src={message.attachment.dataUrl} className="mt-1 w-60 max-w-full" />
                      ) : null}

                      {message.attachment && message.kind === "file" ? (
                        <a
                          href={message.attachment.dataUrl}
                          download={message.attachment.name}
                          className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1.5 text-[13px] font-semibold text-[#111b21] transition hover:bg-black/10"
                        >
                          📎 <span className="truncate">{message.attachment.name}</span>
                          <span className="text-[10px] font-normal text-[#667781]">
                            {humanBytes(message.attachment.size)}
                          </span>
                        </a>
                      ) : null}

                                            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[11.5px] leading-none text-[#667781]">
                        {user && !own ? (
                          <details className="relative">
                            <summary className="cursor-pointer font-medium text-[#667781] transition hover:text-rose-600">
                              Report
                            </summary>
                            <form
                              action={reportCommunityMessageAction}
                              className="absolute bottom-5 right-0 z-20 w-56 space-y-1 rounded-lg border border-[#d1d7db] bg-white p-2 text-left shadow-lg"
                            >
                              <input type="hidden" name="id" value={message.id} />
                              <input type="hidden" name="back" value={back} />
                              <select
                                name="reason"
                                defaultValue="spam"
                                aria-label="Report reason"
                                className="w-full rounded border border-[#d1d7db] px-1 py-1 text-[11px] text-[#111b21]"
                              >
                                {Object.entries(REPORT_REASONS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <input
                                name="note"
                                maxLength={300}
                                placeholder="Optional note for the admin"
                                className="w-full rounded border border-[#d1d7db] px-1 py-1 text-[11px] text-[#111b21]"
                              />
                              <button className="w-full rounded-full bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-600">
                                Send report
                              </button>
                            </form>
                          </details>
                        ) : null}
                        {user && (own || staff) ? (
                          <form action={deleteCommunityMessageAction} className="flex items-center">
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="back" value={back} />
                            <button
                              className="font-medium text-[#667781] transition hover:text-rose-600"
                              aria-label={`Delete message from ${message.userName}`}
                            >
                              Delete
                            </button>
                          </form>
                        ) : null}
                        <span>{clockTime(message.createdAt)}</span>
                        {own ? <DeliveredTicks /> : null}
                      </div>
                    </article>
                  </div>

                  {(index + 1) % adEvery === 0 && index + 1 < messages.length ? (
                    <div className="my-2 flex justify-center px-2">
                      <div className="w-full max-w-sm">
                        {(() => {
                          const ad = chatAdForSlot(sponsoredAds, chatAdSlot++);
                          return ad ? (
                            <ChatSponsoredAd ad={ad} creative={chatAdCreative(db, ad)} />
                          ) : (
                            <CommunityAd
                              clientId={clientId}
                              slotId={inlineSlot}
                              houseText={houseText}
                              houseHref={houseHref}
                              variant="inline"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <div className="max-w-sm rounded-xl bg-[#fdf4c5]/95 px-4 py-3 text-center shadow-sm">
                  <p className="text-[14.5px] font-semibold text-[#111b21]">This room is empty.</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#54656f]">
                    Be the first to ask a question or share something useful about {ai ? ai.name : "any AI tool"}.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CommunityChatScroll>

        <div className="border-t border-[#d1d7db] bg-[#f0f2f5] px-2 pb-2 pt-2 sm:px-3">
          <div className="mx-auto mb-2 max-w-3xl">
            <CommunityAd clientId={clientId} slotId={topSlot} houseText={houseText} houseHref={houseHref} />
          </div>
          {community.enabled ? (
            ban ? (
              <p className="mx-auto w-full max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center text-[13px] font-medium text-rose-700">
                Posting is blocked for your account in this community
                {ban.until ? ` until ${ban.until}` : ""}.
              </p>
            ) : user ? (
              joined ? (
                <CommunityComposer
                  aiId={room.aiId}
                  aiName={ai?.name ?? "any AI tool"}
                  roomId={room.roomId}
                  kinds={kinds}
                  maxLength={community.maxMessageLength}
                />
              ) : (
                <p className="mx-auto w-full max-w-3xl rounded-2xl bg-white px-3 py-2.5 text-center text-[13px] font-medium text-[#54656f] shadow-sm">
                  Join {room.title} above to start posting.
                </p>
              )
            ) : (
              <p className="mx-auto w-full max-w-3xl rounded-2xl bg-white px-3 py-2.5 text-center text-[13px] font-medium text-[#54656f] shadow-sm">
                Log in above to join this community and post.
              </p>
            )
          ) : (
            <p className="mx-auto max-w-3xl rounded-xl bg-[#fdf4c5] px-3 py-2 text-center text-[13px] font-medium text-[#7a6a1f]">
              Posting is closed while the community is paused.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
