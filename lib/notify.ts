import type { DB, EmailMessage, EmailSettings, PushNotification, User } from "./types";

const MAX_NOTIFICATIONS = 80;
const MAX_OUTBOX = 250;

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** In-app notification shown on /notifications and counted in the header bell. */
export function pushNotification(
  db: DB,
  input: {
    title: string;
    body: string;
    href?: string;
    kind?: PushNotification["kind"];
    audience?: PushNotification["audience"];
    auto?: boolean;
  },
): PushNotification {
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const row: PushNotification = {
    id: id("ntf"),
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 300),
    href: input.href && input.href.startsWith("/") ? input.href : "/",
    kind: input.kind ?? "system",
    audience: input.audience ?? "all",
    createdAt: new Date().toISOString(),
    readBy: [],
    auto: input.auto ?? false,
  };
  db.notifications.unshift(row);
  db.notifications = db.notifications.slice(0, MAX_NOTIFICATIONS);
  return row;
}

export function unreadNotifications(db: DB, user: User): number {
  const list = db.notifications ?? [];
  return list.filter(
    (n) => (n.audience === "all" || user.role !== "user") && !(n.readBy ?? []).includes(user.id),
  ).length;
}

export function notificationsFor(db: DB, user: User): PushNotification[] {
  return (db.notifications ?? []).filter((n) => n.audience === "all" || user.role !== "user");
}

/** Replace {{name}}, {{site}}, {{ai}} and {{top5}} placeholders. */
export function renderTemplate(
  template: string,
  vars: { name?: string; site?: string; ai?: string; top5?: string },
): string {
  return template
    .replaceAll("{{name}}", vars.name ?? "there")
    .replaceAll("{{site}}", vars.site ?? "GiggleNode")
    .replaceAll("{{ai}}", vars.ai ?? "this AI")
    .replaceAll("{{top5}}", vars.top5 ?? "");
}

export function queueEmail(
  db: DB,
  settings: EmailSettings,
  input: {
    to: string;
    kind: EmailMessage["kind"];
    subject: string;
    body: string;
    /** verification mail must go out again with a fresh token, even on the same day */
    force?: boolean;
  },
): EmailMessage {
  if (!Array.isArray(db.emailOutbox)) db.emailOutbox = [];
  const row: EmailMessage = {
    id: id("mail"),
    to: input.to,
    subject: renderTemplate(input.subject, { site: db.settings?.siteName ?? "GiggleNode" }).slice(0, 160),
    body: input.body.slice(0, 8000),
    kind: input.kind,
    createdAt: new Date().toISOString(),
    status: "queued",
  };
  // One queued message per address + kind per day keeps the outbox bounded.
  const dayAgo = Date.now() - 86400000;
  const duplicate = input.force
    ? undefined
    : db.emailOutbox.find(
        (m) => m.to.toLowerCase() === row.to.toLowerCase() && m.kind === row.kind && +new Date(m.createdAt) > dayAgo,
      );
  if (duplicate) return duplicate;

  db.emailOutbox.unshift(row);
  db.emailOutbox = db.emailOutbox.slice(0, MAX_OUTBOX);
  void settings;
  return row;
}
