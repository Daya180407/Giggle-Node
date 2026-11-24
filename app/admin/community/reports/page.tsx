import Link from "next/link";
import { reviewCommunityReportAction, unbanCommunityUserAction } from "@/app/actions";
import BanMemberForm from "@/components/admin/BanMemberForm";
import {
  activeCommunityBans,
  communityRoomsFor,
  describeCommunityBan,
  describeCommunityMessage,
  describeCommunityTarget,
  humanBytes,
  KIND_LABELS,
  REPORT_REASONS,
} from "@/lib/community-chat";
import { requireAreaPage } from "@/lib/permissions";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";
import type { CommunityReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCommunityReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ banned?: string; error?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { banned, error } = await searchParams;
  const db = readDb();
  const reports = [...(db.communityReports ?? [])].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  const open = reports.filter((report) => report.status === "open");

  // One row per reported message, so ten reports on the same post do not make
  // ten identical cards in the queue.
  const groups = new Map<string, CommunityReport[]>();
  for (const report of open) {
    const list = groups.get(report.messageId) ?? [];
    list.push(report);
    groups.set(report.messageId, list);
  }
  const rows = [...groups.entries()]
    .map(([messageId, group]) => {
      const message = (db.communityMessages ?? []).find((row) => row.id === messageId);
      const first = group[0];
      const author = db.users.find((user) => user.id === first.messageUserId);
      const authorMessages = (db.communityMessages ?? [])
        .filter((row) => row.userId === first.messageUserId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const authorReports = open.filter((report) => report.messageUserId === first.messageUserId).length;
      return { messageId, group, message, first, author, authorMessages, authorReports };
    })
    .sort((a, b) => +new Date(b.first.createdAt) - +new Date(a.first.createdAt));

  const resolved = reports.filter((report) => report.status === "resolved").slice(0, 12);
  const banRows = activeCommunityBans(db).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const users = [...db.users]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((user) => ({ id: user.id, name: user.name, email: user.email }));
  const ais = [...db.ai]
    .filter((ai) => !ai.hidden)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((ai) => ({ id: ai.id, name: ai.name }));
  const rooms = communityRoomsFor(db)
    .filter((room) => !room.hidden)
    .map((room) => ({ id: room.id, aiId: room.aiId, title: room.title }));

  const uniqueAuthors = new Set(reports.map((report) => report.messageUserId)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Reports &amp; bans</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Members report a message, admins review the reported text next to the author&apos;s recent activity, then
            delete the message, ban the author (one room, one AI or every community) or dismiss the report. Bans are
            enforced on posting and joining immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/community/inbox" className="btn btn-ghost text-xs">
            All messages
          </Link>
          <Link href="/admin/community" className="btn btn-ghost text-xs">
            Rooms
          </Link>
          <Link href="/community" className="btn btn-ghost text-xs">
            Public community ↗
          </Link>
        </div>
      </div>

      {banned ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Ban saved. That member can no longer post in the chosen scope.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Pick a member before saving a ban.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Open reports", value: open.length },
          { label: "Reported messages", value: rows.length },
          { label: "Reported members", value: uniqueAuthors },
          { label: "Active bans", value: banRows.length },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Moderation queue</h3>
        <p className="mt-0.5 text-[11px] text-muted">
          Newest report first. The reported message is shown exactly as the author posted it.
        </p>

        <div className="mt-3 space-y-3">
          {rows.map(({ messageId, group, message, first, author, authorMessages, authorReports }) => {
            const room = describeCommunityTarget(db, first.aiId, first.roomId ?? null);
            return (
              <article key={messageId} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-rose-50 text-rose-700">
                    ⚑ {group.length} report{group.length === 1 ? "" : "s"}
                  </span>
                  <span className="chip bg-white text-slate-600">{room.label}</span>
                  <span className="text-[10.5px] text-muted">reported {timeAgo(first.createdAt)}</span>
                  {message ? null : (
                    <span className="chip bg-slate-100 text-slate-500">Message already deleted</span>
                  )}
                  <Link href={room.href} className="ml-auto text-[11px] font-semibold text-brand hover:underline">
                    Open room ↗
                  </Link>
                </div>

                <div className="mt-2 rounded-lg border border-line bg-white p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink">{first.messageUserName}</span>
                    {author ? <span className="text-[10.5px] text-muted">{author.email}</span> : null}
                    {message ? (
                      <span className="chip bg-slate-100 text-slate-600">{KIND_LABELS[message.kind]}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-slate-700">
                    {message?.body || first.messageBody || "(no text — attachment only)"}
                  </p>
                  {message?.attachment ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      📎 {message.attachment.name} · {humanBytes(message.attachment.size)} · {message.attachment.mime}
                    </p>
                  ) : null}
                  {message?.attachment && message.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.attachment.dataUrl}
                      alt={message.attachment.name}
                      className="mt-2 max-h-40 w-auto rounded-lg border border-line"
                    />
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                  {group.map((report) => (
                    <span key={report.id} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-line">
                      {REPORT_REASONS[report.reason]} · {report.reporterName}
                      {report.note ? `: “${report.note}”` : ""}
                    </span>
                  ))}
                </div>

                <details className="mt-2 rounded-lg border border-line bg-white/80 p-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-brand">
                    Author activity ({authorMessages.length} messages · {authorReports} open report
                    {authorReports === 1 ? "" : "s"})
                  </summary>
                  <div className="mt-1.5 space-y-1">
                    {authorMessages.slice(0, 5).map((row) => {
                      const rowRoom = describeCommunityMessage(db, row);
                      return (
                        <p key={row.id} className="text-[11px] leading-snug text-slate-600">
                          <span className="text-slate-400">{row.createdAt.slice(0, 10)} · {rowRoom.label}:</span>{" "}
                          {row.body.slice(0, 140) || `(${KIND_LABELS[row.kind].toLowerCase()})`}
                        </p>
                      );
                    })}
                    {authorMessages.length === 0 ? (
                      <p className="text-[11px] text-muted">No other messages from this member.</p>
                    ) : null}
                  </div>
                </details>

                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  <div className="flex flex-wrap items-end gap-1.5">
                    <form action={reviewCommunityReportAction}>
                      <input type="hidden" name="id" value={first.id} />
                      <input type="hidden" name="back" value="/admin/community/reports" />
                      <button name="intent" value="delete" className="btn btn-ghost !py-1.5 text-xs text-rose-600">
                        Delete message only
                      </button>
                    </form>
                    <form action={reviewCommunityReportAction}>
                      <input type="hidden" name="id" value={first.id} />
                      <input type="hidden" name="back" value="/admin/community/reports" />
                      <button name="intent" value="dismiss" className="btn btn-ghost !py-1.5 text-xs">
                        Dismiss report
                      </button>
                    </form>

                  </div>

                  <form
                    action={reviewCommunityReportAction}
                    className="flex flex-wrap items-end gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 p-2"
                  >
                    <input type="hidden" name="id" value={first.id} />
                    <input type="hidden" name="intent" value="ban" />
                    <input type="hidden" name="back" value="/admin/community/reports" />
                    <div>
                      <label className="label !text-[10px]" htmlFor={`scope_${first.id}`}>
                        Ban scope
                      </label>
                      <select
                        id={`scope_${first.id}`}
                        name="scope"
                        defaultValue="room"
                        className="field !w-auto !py-1 text-xs"
                      >
                        <option value="room">This room</option>
                        <option value="ai">All rooms of this AI</option>
                        <option value="all">All communities</option>
                      </select>
                    </div>
                    <div>
                      <label className="label !text-[10px]" htmlFor={`days_${first.id}`}>
                        Days (0 = permanent)
                      </label>
                      <input
                        id={`days_${first.id}`}
                        name="days"
                        type="number"
                        min={0}
                        max={3650}
                        defaultValue={0}
                        className="field !w-20 !py-1 text-xs"
                      />
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <label className="label !text-[10px]" htmlFor={`reason_${first.id}`}>
                        Reason
                      </label>
                      <input
                        id={`reason_${first.id}`}
                        name="reason"
                        maxLength={240}
                        defaultValue={REPORT_REASONS[first.reason]}
                        className="field !py-1 text-xs"
                      />
                    </div>
                    <button className="btn btn-primary !bg-rose-600 !py-1.5 text-xs">
                      Delete message &amp; ban author
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {rows.length === 0 ? (
            <p className="rounded-xl border border-line bg-slate-50/60 p-6 text-center text-sm text-muted">
              No open reports. Member reports from every community room land here.
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card p-4">
          <h3 className="text-sm font-bold">Ban any member</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Works without a report too. The ban blocks posting and joining in the chosen scope; reading stays open.
          </p>
          <div className="mt-3">
            <BanMemberForm users={users} ais={ais} rooms={rooms} />
          </div>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Active bans</h3>
            <span className="chip bg-rose-50 text-rose-700">{banRows.length}</span>
          </div>
          <div className="mt-2 divide-y divide-line">
            {banRows.map((ban) => (
              <div key={ban.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {ban.userName} <span className="font-normal text-muted">· {ban.userEmail || "no email"}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {describeCommunityBan(db, ban)} · {ban.until ? `until ${ban.until}` : "permanent"} · by{" "}
                    {ban.bannedBy} · {timeAgo(ban.createdAt)}
                  </p>
                  {ban.reason ? <p className="text-[11px] text-slate-600">{ban.reason}</p> : null}
                </div>
                <form action={unbanCommunityUserAction}>
                  <input type="hidden" name="id" value={ban.id} />
                  <input type="hidden" name="back" value="/admin/community/reports" />
                  <button className="btn btn-ghost !px-2 !py-1 text-xs">Unban</button>
                </form>
              </div>
            ))}
            {banRows.length === 0 ? <p className="py-4 text-sm text-muted">No active bans.</p> : null}
          </div>
        </section>
      </div>

      {resolved.length ? (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-bold">Recently handled reports ({resolved.length})</summary>
          <div className="mt-2 divide-y divide-line">
            {resolved.map((report) => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-slate-600">
                  {report.messageUserName} · {REPORT_REASONS[report.reason]}
                  {report.note ? ` · “${report.note}”` : ""}
                </span>
                <span className="chip bg-slate-100 text-slate-500">{report.action || "resolved"}</span>
                <span className="text-[10px] text-slate-400">
                  {report.reviewedBy ?? "admin"} · {(report.reviewedAt ?? report.createdAt).slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
