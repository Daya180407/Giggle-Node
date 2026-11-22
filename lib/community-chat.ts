import { getSiteSettings } from "./settings";
import { mutateDb, readDb, uid } from "./store";
import type { Ai, CommunityMessage, CommunityMessageKind, CommunityRoom, CommunitySettings, DB } from "./types";

/**
 * Per-AI community rooms.
 *
 * Every public AI gets an implicit default room at /community/<ai-slug>. An admin
 * can add extra rooms under the same AI from /admin/community; those carry their
 * own globally unique slug and their messages store roomId. The default room's
 * messages keep roomId null.
 *
 * Everything lives in the same JSON document as the rest of the site, so a room
 * is just a filtered list of messages. Attachments are data URLs (the same
 * approach as the media library) with hard size caps, and every room is trimmed
 * to the admin retention window plus a fixed row limit so the document cannot
 * grow without bound.
 */

export const MAX_MESSAGES_PER_ROOM = 250;
export const MAX_MESSAGES_TOTAL = 2000;

/**
 * One open discussion room where any AI can be the topic, pinned at the top of
 * the community index. It keeps its own messages; it never merges the AI rooms.
 */
export const UNIVERSAL_ROOM_SLUG = "everyone";
export const UNIVERSAL_AI_ID = "__all__";
export const UNIVERSAL_ROOM_ID = "__universal__";

/** Byte caps for the three attachment kinds. Checked again on the server. */
export const ATTACHMENT_LIMITS: Record<Exclude<CommunityMessageKind, "text">, number> = {
  image: 300_000,
  voice: 250_000,
  file: 150_000,
};

export const KIND_LABELS: Record<CommunityMessageKind, string> = {
  text: "Text",
  image: "Image",
  voice: "Voice note",
  file: "File",
};

export type RoomSummary = { count: number; lastAt: string | null };

/** A resolved room, either an AI's default room or an admin-created one. */
export type RoomRef = {
  key: string;
  aiId: string;
  slug: string;
  title: string;
  description: string;
  /** null for the AI's default room */
  roomId: string | null;
  /** universal rooms are not tied to a single AI */
  scope: "universal" | "ai";
  hidden: boolean;
  createdAt: string | null;
};

export function roomSummaryKey(aiId: string, roomId: string | null | undefined): string {
  return `${aiId}::${roomId ?? ""}`;
}

export function communityKindAllowed(settings: CommunitySettings, kind: CommunityMessageKind): boolean {
  if (kind === "image") return settings.allowImages;
  if (kind === "voice") return settings.allowVoice;
  if (kind === "file") return settings.allowFiles;
  return settings.allowText;
}

export function allowedCommunityKinds(settings: CommunitySettings): CommunityMessageKind[] {
  return (["text", "image", "voice", "file"] as CommunityMessageKind[]).filter((kind) =>
    communityKindAllowed(settings, kind),
  );
}

export function defaultRoomFor(ai: Ai): RoomRef {
  const description = ai.description?.trim() ?? "";
  return {
    key: roomSummaryKey(ai.id, null),
    aiId: ai.id,
    slug: ai.slug,
    title: `${ai.name} community`,
    description: description.length > 180 ? `${description.slice(0, 177)}…` : description,
    roomId: null,
    scope: "ai",
    hidden: false,
    createdAt: ai.createdAt ?? null,
  };
}

export function universalRoom(): RoomRef {
  return {
    key: roomSummaryKey(UNIVERSAL_AI_ID, UNIVERSAL_ROOM_ID),
    aiId: UNIVERSAL_AI_ID,
    slug: UNIVERSAL_ROOM_SLUG,
    title: "Everyone community",
    description:
      "An open room to talk about any AI tool — ask questions, compare tools and help each other. This room keeps its own conversation.",
    roomId: UNIVERSAL_ROOM_ID,
    scope: "universal",
    hidden: false,
    createdAt: null,
  };
}

export function communityRoomsFor(db: DB, aiId?: string): CommunityRoom[] {
  return (db.communityRooms ?? []).filter((room) => !aiId || room.aiId === aiId);
}

/**
 * Public lookup by URL slug. An admin room wins only when it is not hidden;
 * otherwise the slug is treated as an AI slug (the default room).
 */
export function findCommunityRoom(db: DB, slug: string): { ai: Ai | null; room: RoomRef } | null {
  if (slug === UNIVERSAL_ROOM_SLUG) return { ai: null, room: universalRoom() };
  const custom = (db.communityRooms ?? []).find((row) => row.slug === slug && !row.hidden);
  if (custom) {
    const ai = db.ai.find((row) => row.id === custom.aiId && !row.hidden);
    if (ai) {
      return {
        ai,
        room: {
          key: roomSummaryKey(ai.id, custom.id),
          aiId: ai.id,
          slug: custom.slug,
          title: custom.title,
          description: custom.description,
          roomId: custom.id,
          scope: "ai",
          hidden: false,
          createdAt: custom.createdAt,
        },
      };
    }
  }
  const ai = db.ai.find((row) => row.slug === slug && !row.hidden);
  return ai ? { ai, room: defaultRoomFor(ai) } : null;
}

/** Room messages, oldest first, so the newest post sits at the bottom of the chat. */
export function communityMessagesForRoom(db: DB, aiId: string, roomId: string | null): CommunityMessage[] {
  return (db.communityMessages ?? [])
    .filter((message) => message.aiId === aiId && (message.roomId ?? null) === roomId)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

/**
 * Members of a room: everyone who joined it, plus anyone who already posted in
 * it, so rooms that were active before joining existed keep their real count.
 */
export function communityMemberIds(db: DB, aiId: string, roomId: string | null): Set<string> {
  const ids = new Set<string>();
  for (const row of db.communityMembers ?? []) {
    if (row.aiId === aiId && (row.roomId ?? null) === roomId) ids.add(row.userId);
  }
  for (const message of db.communityMessages ?? []) {
    if (message.aiId === aiId && (message.roomId ?? null) === roomId) ids.add(message.userId);
  }
  return ids;
}

/** Member ids keyed by roomSummaryKey, for the community list. */
export function communityMemberIdsByRoom(db: DB): Map<string, Set<string>> {
  const rooms = new Map<string, Set<string>>();
  const add = (aiId: string, roomId: string | null | undefined, userId: string) => {
    const key = roomSummaryKey(aiId, roomId);
    const ids = rooms.get(key) ?? new Set<string>();
    ids.add(userId);
    rooms.set(key, ids);
  };
  for (const row of db.communityMembers ?? []) add(row.aiId, row.roomId, row.userId);
  for (const message of db.communityMessages ?? []) add(message.aiId, message.roomId, message.userId);
  return rooms;
}

export function communityMemberCount(db: DB, aiId: string, roomId: string | null): number {
  return communityMemberIds(db, aiId, roomId).size;
}

export function communityMemberCounts(db: DB): Map<string, number> {
  const counts = new Map<string, number>();
  communityMemberIdsByRoom(db).forEach((ids, key) => counts.set(key, ids.size));
  return counts;
}

/** A user can post only after joining; past posters count as joined. */
export function isCommunityMember(db: DB, userId: string, aiId: string, roomId: string | null): boolean {
  return communityMemberIds(db, aiId, roomId).has(userId);
}

export function addCommunityMember(db: DB, userId: string, aiId: string, roomId: string | null): boolean {
  if (isCommunityMember(db, userId, aiId, roomId)) return false;
  if (!Array.isArray(db.communityMembers)) db.communityMembers = [];
  db.communityMembers.push({
    id: uid("cmm"),
    userId,
    aiId,
    roomId,
    joinedAt: new Date().toISOString(),
  });
  return true;
}

/** Message counts and last activity per room, used by the community index. */
export function communityRoomSummary(db: DB): Map<string, RoomSummary> {
  const summary = new Map<string, RoomSummary>();
  for (const message of db.communityMessages ?? []) {
    const key = roomSummaryKey(message.aiId, message.roomId);
    const row = summary.get(key) ?? { count: 0, lastAt: null };
    row.count += 1;
    if (!row.lastAt || +new Date(message.createdAt) > +new Date(row.lastAt)) row.lastAt = message.createdAt;
    summary.set(key, row);
  }
  return summary;
}

export function communityTotals(db: DB) {
  const rows = db.communityMessages ?? [];
  const rooms = new Set(rows.map((row) => roomSummaryKey(row.aiId, row.roomId)));
  const members = new Set<string>();
  for (const row of rows) members.add(row.userId);
  for (const row of db.communityMembers ?? []) members.add(row.userId);
  return { messages: rows.length, rooms: rooms.size, members: members.size };
}

/** Deletes expired rows and keeps each room inside its row cap. Returns rows removed. */
export function pruneCommunityMessages(db: DB, retentionDays: number, now = Date.now()): number {
  const original = db.communityMessages ?? [];
  if (original.length === 0) {
    db.communityMessages = [];
    return 0;
  }

  const days = Math.min(365, Math.max(1, Math.round(retentionDays) || 30));
  const cutoff = now - days * 86400000;
  let rows = original.filter((message) => {
    const at = +new Date(message.createdAt);
    return Number.isFinite(at) && at >= cutoff;
  });

  // Per-room cap: newest messages win.
  const perRoom = new Map<string, CommunityMessage[]>();
  for (const message of rows) {
    const key = roomSummaryKey(message.aiId, message.roomId);
    const list = perRoom.get(key) ?? [];
    list.push(message);
    perRoom.set(key, list);
  }
  const keep = new Set<string>();
  perRoom.forEach((list) => {
    list
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, MAX_MESSAGES_PER_ROOM)
      .forEach((message) => keep.add(message.id));
  });
  rows = rows.filter((message) => keep.has(message.id));

  // Global cap, so many quiet rooms together still cannot bloat the document.
  if (rows.length > MAX_MESSAGES_TOTAL) {
    rows = rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, MAX_MESSAGES_TOTAL);
  }

  rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  db.communityMessages = rows;
  return original.length - rows.length;
}

function needsPrune(db: DB, retentionDays: number): boolean {
  const rows = db.communityMessages ?? [];
  if (rows.length === 0) return false;
  if (rows.length > MAX_MESSAGES_TOTAL) return true;

  const cutoff = Date.now() - Math.min(365, Math.max(1, retentionDays)) * 86400000;
  const perRoom = new Map<string, number>();
  for (const message of rows) {
    if (+new Date(message.createdAt) < cutoff) return true;
    const key = roomSummaryKey(message.aiId, message.roomId);
    const count = (perRoom.get(key) ?? 0) + 1;
    if (count > MAX_MESSAGES_PER_ROOM) return true;
    perRoom.set(key, count);
  }
  return false;
}

/**
 * Called by the community pages. Retention cleanup only writes when something
 * actually expired, so normal page views stay read-only.
 */
export function sweepCommunityMessages(): void {
  const db = readDb();
  const days = getSiteSettings(db).community.retentionDays;
  if (!needsPrune(db, days)) return;
  mutateDb((draft) => {
    pruneCommunityMessages(draft, getSiteSettings(draft).community.retentionDays);
  });
}

/** Human-readable room label for the admin moderation inbox. */
export function describeCommunityMessage(db: DB, message: CommunityMessage): { label: string; href: string } {
  if (message.aiId === UNIVERSAL_AI_ID) {
    return { label: "Everyone community · any AI", href: `/community/${UNIVERSAL_ROOM_SLUG}` };
  }
  const ai = db.ai.find((row) => row.id === message.aiId);
  const aiName = ai?.name ?? "Unknown AI";
  if (message.roomId) {
    const room = (db.communityRooms ?? []).find((row) => row.id === message.roomId);
    if (room) return { label: `${aiName} · ${room.title}`, href: `/community/${room.slug}` };
  }
  return { label: `${aiName} · default room`, href: ai ? `/community/${ai.slug}` : "/community" };
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Short line used under a room card when a message has no text body. */
export function messagePreview(message: CommunityMessage): string {
  if (message.body) return message.body;
  if (message.kind === "image") return "Shared an image";
  if (message.kind === "voice") return "Shared a voice note";
  if (message.kind === "file") return "Shared a file";
  return "";
}
