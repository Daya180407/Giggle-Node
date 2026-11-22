import Link from "next/link";
import {
  deleteCommunityRoomAction,
  saveCommunityRoomAction,
  toggleCommunityRoomAction,
} from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { communityRoomSummary, communityRoomsFor, communityTotals, roomSummaryKey } from "@/lib/community-chat";
import { requireAreaPage } from "@/lib/permissions";
import { timeAgo } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; error?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { q = "", saved, error } = await searchParams;
  const db = readDb();
  const query = q.trim().toLowerCase();
  const summary = communityRoomSummary(db);
  const totals = communityTotals(db);
  const aiById = new Map(db.ai.map((ai) => [ai.id, ai]));

  const rooms = communityRoomsFor(db)
    .filter((room) => {
      if (!query) return true;
      const ai = aiById.get(room.aiId);
      return [room.title, room.description, room.slug, ai?.name ?? ""].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const aiOptions = [...db.ai]
    .filter((ai) => !ai.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Community rooms</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Every public AI already has a default room. Create extra topic rooms under any AI — for example “Coding
            help” or “Prompt ideas” — and hide or remove one whenever you need.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/community/inbox" className="btn btn-ghost text-xs">
            Moderation inbox
          </Link>
          <Link href="/admin/settings" className="btn btn-ghost text-xs">
            Community settings
          </Link>
          <Link href="/community" className="btn btn-ghost text-xs">
            View public community ↗
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Room created.{" "}
          <Link href={`/community/${saved}`} className="font-semibold underline">
            Open /community/{saved}
          </Link>
        </div>
      ) : null}
      {error === "title" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Give the room a title of at least 3 characters.
        </div>
      ) : null}
      {error === "ai" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Pick a valid AI for this room.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Topic rooms", value: rooms.length.toLocaleString("en-IN") },
          { label: "Messages", value: totals.messages.toLocaleString("en-IN") },
          { label: "Active rooms", value: totals.rooms.toLocaleString("en-IN") },
          { label: "AI tools", value: aiOptions.length.toLocaleString("en-IN") },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="card p-4 sm:p-5">
        <h3 className="text-sm font-bold">Create a community room</h3>
        <p className="mt-0.5 text-xs text-muted">
          The room gets its own public page and a unique slug built from the title. Members post in it exactly like the
          default room.
        </p>
        <form action={saveCommunityRoomAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="roomAi">
              AI tool
            </label>
            <select id="roomAi" name="aiId" className="field !py-2 text-sm" required>
              {aiOptions.map((ai) => (
                <option key={ai.id} value={ai.id}>
                  {ai.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="roomTitle">
              Room title
            </label>
            <input
              id="roomTitle"
              name="title"
              className="field !py-2 text-sm"
              placeholder="Coding help"
              maxLength={60}
              minLength={3}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="roomDescription">
              Short description (optional)
            </label>
            <input
              id="roomDescription"
              name="description"
              className="field !py-2 text-sm"
              placeholder="Share code problems, fixes and prompts for this tool."
              maxLength={240}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary !py-2 text-xs">Create room</button>
          </div>
        </form>
      </section>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/community">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search rooms by title, slug, description or AI…"
          className="field min-w-[220px] flex-1 !py-2 text-xs"
          aria-label="Search community rooms"
        />
        <button className="btn btn-primary !py-2 text-xs">Filter</button>
        {q ? (
          <Link href="/admin/community" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{rooms.length} rooms</span>
      </form>

      <div className="card divide-y divide-line">
        {rooms.map((room) => {
          const ai = aiById.get(room.aiId);
          const roomStats = summary.get(roomSummaryKey(room.aiId, room.id)) ?? { count: 0, lastAt: null };
          return (
            <div key={room.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{room.title}</p>
                  <p className="truncate text-xs text-muted">
                    {ai ? ai.name : "Unknown AI"} · /community/{room.slug} · {roomStats.count}{" "}
                    {roomStats.count === 1 ? "message" : "messages"}
                    {roomStats.lastAt ? ` · active ${timeAgo(roomStats.lastAt)}` : ""}
                    {" · created "}
                    {timeAgo(room.createdAt)}
                  </p>
                </div>
                <span className={`chip ${room.hidden ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {room.hidden ? "Hidden" : "Live"}
                </span>
                {!room.hidden ? (
                  <Link href={`/community/${room.slug}`} className="btn btn-ghost !px-2 !py-1 text-xs">
                    Open ↗
                  </Link>
                ) : null}
                <form action={toggleCommunityRoomAction}>
                  <input type="hidden" name="id" value={room.id} />
                  <button className="btn btn-ghost !px-2 !py-1 text-xs">{room.hidden ? "Publish" : "Hide"}</button>
                </form>
                <form action={deleteCommunityRoomAction}>
                  <input type="hidden" name="id" value={room.id} />
                  <DeleteButton label="Delete" message="Delete this room and every message in it?" />
                </form>
              </div>
              {room.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{room.description}</p> : null}
            </div>
          );
        })}
        {rooms.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {q ? "No room matches that search." : "No topic rooms yet — every AI still has its default room."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
