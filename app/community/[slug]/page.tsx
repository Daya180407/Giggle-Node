import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { deleteCommunityMessageAction } from "@/app/actions";
import CommunityAd from "@/components/CommunityAd";
import CommunityComposer from "@/components/CommunityComposer";
import { AiLogo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import {
  allowedCommunityKinds,
  communityMessagesForRoom,
  findCommunityRoom,
  humanBytes,
  KIND_LABELS,
  sweepCommunityMessages,
} from "@/lib/community-chat";
import { buildView, timeAgo } from "@/lib/rank";
import { isStaffRole, resolveRoles } from "@/lib/roles";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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
      `The GigleNode community room for ${ai.name}. Share problems, ideas, tips, screenshots, voice notes and files with other users. Free to join.`,
    alternates: { canonical: `/community/${room.slug}` },
  };
}

export default async function CommunityRoomPage({ params }: Props) {
  const { slug } = await params;
  sweepCommunityMessages();

  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const found = findCommunityRoom(db, slug);
  if (!found) notFound();
  const { ai, room } = found;

  const settings = getSiteSettings(db);
  const community = settings.community;
  const kinds = allowedCommunityKinds(community);
  const roomMessages = communityMessagesForRoom(db, ai.id, room.roomId);
  const messages = roomMessages.slice(-100);
  const stat = buildView(db).aiStats.get(ai.id);
  const staff = user ? isStaffRole(user.role, resolveRoles(db.roles)) : false;
  const back = `/community/${room.slug}`;

  const adsReady = settings.adsEnabled && /^ca-pub-\d{16}$/.test(settings.adsClientId);
  const clientId = community.adsEnabled && adsReady ? settings.adsClientId : "";
  const topSlot = community.adsEnabled ? community.adTopSlot || settings.adsTopSlot : "";
  const inlineSlot = community.adsEnabled ? community.adInlineSlot || settings.adsArticleSlot : "";
  const houseText = community.adsEnabled ? community.houseAdText : "";
  const houseHref = community.adsEnabled ? community.houseAdHref : "";
  const adEvery = Math.max(3, community.adEvery);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/community" className="hover:text-brand">
          Community
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{room.title}</span>
      </nav>

      <header className="page-hero mt-3">
        <div className="flex flex-wrap items-center gap-3">
          <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={56} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold sm:text-2xl">{room.title}</h1>
            {room.roomId && room.description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{room.description}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted">
              <Link href={`/ai/${ai.slug}`} className="font-semibold text-slate-600 hover:text-brand">
                {ai.name}
              </Link>{" "}
              · {categoryName(ai.category)}
              {stat ? ` · ${stat.score.toFixed(1)}★ from ${stat.votes.toLocaleString("en-IN")} ratings` : ""}
            </p>
          </div>
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost !py-1.5 text-xs">
            View AI page ↗
          </Link>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Ask a question, share a problem or an idea, or help someone else get more from {ai.name}. Free for every
          signed-in member. Messages are deleted automatically after {community.retentionDays} days.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">
            💬 {roomMessages.length} {roomMessages.length === 1 ? "message" : "messages"}
          </span>
          <span className="chip bg-emerald-50 text-emerald-700">Free</span>
          <span className="chip bg-amber-50 text-amber-700">Auto-delete · {community.retentionDays} days</span>
          {kinds.length ? (
            <span className="chip bg-slate-100 text-slate-600">
              {kinds.map((kind) => KIND_LABELS[kind]).join(" · ")}
            </span>
          ) : null}
        </div>
      </header>

      {!community.enabled ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          The community is paused by the administrator. You can read the history, but new posts are closed.
        </div>
      ) : null}

      <section className="card mt-4 overflow-hidden">
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <Fragment key={message.id}>
              <article className="rounded-2xl border border-line bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[11px] font-bold text-white">
                    {message.avatar || message.userName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-ink">{message.userName}</span>
                  <span className="text-[10.5px] text-muted">{timeAgo(message.createdAt)}</span>
                  {user && (user.id === message.userId || staff) ? (
                    <form action={deleteCommunityMessageAction} className="ml-auto">
                      <input type="hidden" name="id" value={message.id} />
                      <input type="hidden" name="back" value={back} />
                      <button className="text-[10.5px] font-medium text-muted transition hover:text-rose-600">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>

                {message.body ? (
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                    {message.body}
                  </p>
                ) : null}

                {message.attachment && message.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.attachment.dataUrl}
                    alt={message.attachment.name}
                    loading="lazy"
                    className="mt-2 max-h-72 w-auto rounded-xl border border-line"
                  />
                ) : null}

                {message.attachment && message.kind === "voice" ? (
                  <audio controls preload="none" src={message.attachment.dataUrl} className="mt-2 w-full max-w-sm" />
                ) : null}

                {message.attachment && message.kind === "file" ? (
                  <a
                    href={message.attachment.dataUrl}
                    download={message.attachment.name}
                    className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-brand"
                  >
                    📎 <span className="truncate">{message.attachment.name}</span>
                    <span className="text-[10px] font-normal text-muted">{humanBytes(message.attachment.size)}</span>
                  </a>
                ) : null}
              </article>

              {(index + 1) % adEvery === 0 && index + 1 < messages.length ? (
                <CommunityAd
                  clientId={clientId}
                  slotId={inlineSlot}
                  houseText={houseText}
                  houseHref={houseHref}
                  variant="inline"
                />
              ) : null}
            </Fragment>
          ))}

          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-ink">This room is empty.</p>
              <p className="mt-1 text-xs text-muted">
                Be the first to ask a question or share something useful about {ai.name}.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-line bg-slate-50/40 p-3">
          <CommunityAd clientId={clientId} slotId={topSlot} houseText={houseText} houseHref={houseHref} />
          {community.enabled ? (
            user ? (
              <CommunityComposer
                aiId={ai.id}
                aiName={ai.name}
                roomId={room.roomId}
                kinds={kinds}
                maxLength={community.maxMessageLength}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-white p-3">
                <p className="text-xs text-slate-600">
                  Log in to post in this room. Posting is free and open to every member.
                </p>
                <Link href={`/login?next=${encodeURIComponent(back)}`} className="btn btn-primary mt-2 !py-1.5 text-xs">
                  Log in to join
                </Link>
              </div>
            )
          ) : (
            <p className="text-xs font-medium text-amber-700">Posting is closed while the community is paused.</p>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-bold text-ink">Room rules</h2>
          <ul className="mt-2 space-y-1 text-[11.5px] leading-relaxed text-slate-600">
            <li>• Be respectful — no spam, hate or personal attacks.</li>
            <li>• Stay on topic: questions, ideas and tips about {ai.name}.</li>
            <li>• Do not share private data, passwords or someone else&apos;s files.</li>
            <li>• Every {community.retentionDays} days older messages are deleted automatically.</li>
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-bold text-ink">What you can share</h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
            {kinds.length
              ? `The administrator allows: ${kinds.map((kind) => KIND_LABELS[kind]).join(", ")}. Attachments are size-limited and photos are compressed before posting.`
              : "The administrator has not enabled any post type yet."}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            Community is free and always non-popup. Ads stay inline, never over the chat.
          </p>
        </div>
      </div>
    </div>
  );
}
