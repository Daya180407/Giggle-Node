import Link from "next/link";
import { deleteCommunityMessageAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  describeCommunityMessage,
  humanBytes,
  KIND_LABELS,
  openReportCounts,
  roomSummaryKey,
  UNIVERSAL_AI_ID,
} from "@/lib/community-chat";
import { requireAreaPage } from "@/lib/permissions";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

export default async function AdminCommunityInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ai?: string; kind?: string; page?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", ai = "all", kind = "all", page = "1" } = await searchParams;
  const db = readDb();
  const query = q.trim().toLowerCase();
  const reportCounts = openReportCounts(db);
  const openReports = [...reportCounts.values()].reduce((sum, count) => sum + count, 0);

  const messages = [...(db.communityMessages ?? [])].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  const aiOptions = db.ai
    .filter((row) => messages.some((message) => message.aiId === row.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = messages
    .filter((message) => {
      if (ai === "all") return true;
      if (ai === "everyone") return message.aiId === UNIVERSAL_AI_ID;
      return message.aiId === ai;
    })
    .filter((message) => (kind === "all" ? true : message.kind === kind))
    .filter((message) => {
      if (!query) return true;
      const room = describeCommunityMessage(db, message);
      return [message.body, message.userName, message.attachment?.name ?? "", room.label]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  const params = (nextPage: number) =>
    new URLSearchParams({
      ...(q ? { q } : {}),
      ...(ai !== "all" ? { ai } : {}),
      ...(kind !== "all" ? { kind } : {}),
      ...(nextPage > 1 ? { page: String(nextPage) } : {}),
    }).toString();
  const back = `/admin/community/inbox${params(pageNo) ? `?${params(pageNo)}` : ""}`;
  const pageHref = (nextPage: number) => `/admin/community/inbox${params(nextPage) ? `?${params(nextPage)}` : ""}`;

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const today = messages.filter((message) => +new Date(message.createdAt) >= todayStart).length;
  const activeRooms = new Set(messages.map((message) => roomSummaryKey(message.aiId, message.roomId))).size;
  const universalCount = messages.filter((message) => message.aiId === UNIVERSAL_AI_ID).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Moderation inbox</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Every message from every room in one place — default AI rooms, admin topic rooms and the pinned Everyone
            community. Filter, open the room, or remove a message.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/community/reports" className="btn btn-ghost text-xs">
            ⚑ Reports &amp; bans{openReports ? ` (${openReports})` : ""}
          </Link>
          <Link href="/admin/community" className="btn btn-ghost text-xs">
            Rooms
          </Link>
          <Link href="/community" className="btn btn-ghost text-xs">
            Public community ↗
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "All messages", value: messages.length.toLocaleString("en-IN") },
          { label: "Today", value: today.toLocaleString("en-IN") },
          { label: "Active rooms", value: activeRooms.toLocaleString("en-IN") },
          { label: "Everyone room", value: universalCount.toLocaleString("en-IN") },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/community/inbox">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search message, member, attachment or room…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search community messages"
        />
        <select name="ai" defaultValue={ai} className="field !w-auto !py-2 text-xs" aria-label="Filter by AI">
          <option value="all">All AIs</option>
          <option value="everyone">Everyone community (any AI)</option>
          {aiOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue={kind} className="field !w-auto !py-2 text-xs" aria-label="Filter by kind">
          <option value="all">Any type</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="voice">Voice note</option>
          <option value="file">File</option>
        </select>
        <button className="btn btn-primary !py-2 text-xs">Filter</button>
        {q || ai !== "all" || kind !== "all" ? (
          <Link href="/admin/community/inbox" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card divide-y divide-line">
        {rows.map((message) => {
          const room = describeCommunityMessage(db, message);
          return (
            <div key={message.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[11px] font-bold text-white">
                  {message.avatar || message.userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-ink">{message.userName}</span>
                <span className="chip bg-slate-100 text-slate-600">{KIND_LABELS[message.kind]}</span>
                <Link href={room.href} className="chip bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100">
                  {room.label}
                </Link>
                <span className="text-[10.5px] text-muted">{timeAgo(message.createdAt)}</span>
                {reportCounts.get(message.id) ? (
                  <Link
                    href="/admin/community/reports"
                    className="chip bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                  >
                    ⚑ {reportCounts.get(message.id)} report{reportCounts.get(message.id) === 1 ? "" : "s"}
                  </Link>
                ) : null}
                <form action={deleteCommunityMessageAction} className="ml-auto">
                  <input type="hidden" name="id" value={message.id} />
                  <input type="hidden" name="back" value={back} />
                  <DeleteButton label="Delete" message="Delete this message from the community?" />
                </form>
              </div>
              {message.body ? (
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {message.body}
                </p>
              ) : null}
              {message.attachment ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  📎 {message.attachment.name} · {humanBytes(message.attachment.size)} · {message.attachment.mime}
                </p>
              ) : null}
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No messages match these filters. Community posts will appear here as members join.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Showing {filtered.length ? (pageNo - 1) * PER_PAGE + 1 : 0}–{Math.min(pageNo * PER_PAGE, filtered.length)} of{" "}
          {filtered.length}
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1.5">
            {pageNo > 1 ? (
              <Link href={pageHref(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                ← Prev
              </Link>
            ) : null}
            <span className="px-1 text-xs text-muted">
              {pageNo} / {pages}
            </span>
            {pageNo < pages ? (
              <Link href={pageHref(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
