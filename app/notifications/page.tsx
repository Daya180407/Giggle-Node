import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { markNotificationsReadAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { notificationsFor, unreadNotifications } from "@/lib/notify";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  description: "New AI tools and fresh guides from GigleNode.",
  robots: { index: false, follow: false },
};

const KIND_ICON: Record<string, string> = { ai: "🤖", post: "📝", rating: "★", system: "📣" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  const db = readDb();
  const rows = notificationsFor(db, user);
  const unread = unreadNotifications(db, user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="display mt-1 text-3xl text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            New AI tools, published guides and site announcements. {unread > 0 ? `${unread} unread.` : "All caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markNotificationsReadAction}>
            <button className="btn btn-ghost text-xs">Mark all read</button>
          </form>
        ) : null}
      </header>

      <div className="card mt-5 divide-y divide-line overflow-hidden">
        {rows.map((row) => {
          const isUnread = !(row.readBy ?? []).includes(user.id);
          return (
            <Link
              key={row.id}
              href={row.href}
              className={`flex items-start gap-3 p-4 transition hover:bg-slate-50 ${isUnread ? "bg-brand-soft/30" : ""}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg ring-1 ring-line">
                {KIND_ICON[row.kind] ?? "📣"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-ink">{row.title}</span>
                  {isUnread ? <span className="live-dot" aria-hidden /> : null}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{row.body}</span>
                <span className="mt-1 block text-[11px] text-muted">
                  {timeAgo(row.createdAt)}
                  {row.audience === "staff" ? " · staff only" : ""}
                </span>
              </span>
            </Link>
          );
        })}
        {rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl" aria-hidden>
              🔔
            </p>
            <p className="mt-1 text-sm text-slate-600">
              No notifications yet. New AI tools and guides will appear here.
            </p>
            <Link href="/category/all" className="btn btn-primary mt-3 text-xs">
              Explore rankings
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
