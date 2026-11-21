import Link from "next/link";
import { deleteUserAction, toggleBanAction, toggleRoleAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { getCurrentUser } from "@/lib/auth";
import { contributorBoard, formatDate } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const { q = "", role = "all", page = "1" } = await searchParams;
  const db = readDb();
  const admin = await getCurrentUser();
  const board = contributorBoard(db, 10);
  const boardIds = new Set(board.map((b) => b.user.id));
  const query = q.trim().toLowerCase();

  const filtered = db.users.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (!query) return true;
    return [u.name, u.email, u.id].join(" ").toLowerCase().includes(query);
  });
  filtered.sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageNo = Math.min(Math.max(1, Number(page) || 1), pages);
  const users = filtered.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const ratingCount = (id: string) => db.ratings.filter((r) => r.userId === id).length;
  const joined7 = db.users.filter((u) => Date.now() - +new Date(u.createdAt) < 7 * 86400000).length;
  const params = (nextPage: number) =>
    `/admin/users?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(role !== "all" ? { role } : {}),
      page: String(nextPage),
    }).toString()}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Community</p>
        <h2 className="display mt-1 text-2xl text-ink">Users & access</h2>
        <p className="mt-1 text-xs text-muted">
          {db.users.length.toLocaleString("en-IN")} accounts · {db.users.filter((u) => u.role === "admin").length} admins ·{" "}
          {db.users.filter((u) => u.banned).length} banned
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Total users", value: db.users.length, hint: "All accounts" },
          { label: "Admins", value: db.users.filter((u) => u.role === "admin").length, hint: "Full access" },
          { label: "Banned", value: db.users.filter((u) => u.banned).length, hint: "Cannot sign in" },
          { label: "New (7 days)", value: joined7, hint: "Recent signups" },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value.toLocaleString("en-IN")}</p>
            <p className="text-[10.5px] text-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Top reviewers</h3>
          <span className="text-[11px] text-muted">By review score</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {board.map((row) => (
            <span key={row.user.id} className="chip bg-amber-50 text-amber-700">
              {row.user.avatar} {row.user.name} · {row.score}
            </span>
          ))}
        </div>
      </section>

      <form className="card flex flex-wrap items-center gap-2 p-3" action="/admin/users">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or id…"
          className="field min-w-[200px] flex-1 !py-2 text-xs"
          aria-label="Search users"
        />
        <select name="role" defaultValue={role} className="field !w-auto !py-2 text-xs" aria-label="Filter role">
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
        <button className="btn btn-primary !py-2 text-xs">Search</button>
        {q || role !== "all" ? (
          <Link href="/admin/users" className="btn btn-ghost !py-2 text-xs">
            Reset
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} results</span>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Ratings</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const self = u.id === admin?.id;
              return (
                <tr key={u.id} className={`hover:bg-slate-50/60 ${u.banned ? "bg-rose-50/30" : ""}`}>
                  <td className="p-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {u.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{u.name}</span>
                        <span className="block text-[10px] text-muted">
                          {self ? "You" : u.isSeed ? "Seeded reviewer" : u.id}
                        </span>
                      </span>
                      {boardIds.has(u.id) ? <span className="chip bg-amber-50 text-amber-700">Top</span> : null}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`chip ${
                        u.role === "admin" ? "bg-brand-soft text-brand" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.banned ? (
                      <span className="chip bg-rose-50 text-rose-600">Banned</span>
                    ) : (
                      <span className="chip bg-emerald-50 text-emerald-700">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">{ratingCount(u.id)}</td>
                  <td className="p-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {self ? (
                        <span className="text-[11px] text-muted">Current account</span>
                      ) : (
                        <>
                          <form action={toggleRoleAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button className="btn btn-ghost !px-2 !py-1 text-xs">
                              {u.role === "admin" ? "Make user" : "Make admin"}
                            </button>
                          </form>
                          <form action={toggleBanAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              className={`btn !px-2 !py-1 text-xs ${
                                u.banned
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "btn-ghost text-rose-600"
                              }`}
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </button>
                          </form>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <DeleteButton
                              label="Delete"
                              message={`${u.name} ka account, ratings, bookmarks aur follows permanently delete honge. Pakka?`}
                            />
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 ? <p className="p-8 text-center text-sm text-muted">No users match these filters.</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Banned users cannot sign in or keep an active session. Deleting a user removes their ratings and saved tools.
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1.5">
            {pageNo > 1 ? (
              <Link href={params(pageNo - 1)} className="btn btn-ghost !py-1.5 text-xs">
                ← Prev
              </Link>
            ) : null}
            <span className="px-1 text-xs text-muted">
              {pageNo} / {pages}
            </span>
            {pageNo < pages ? (
              <Link href={params(pageNo + 1)} className="btn btn-ghost !py-1.5 text-xs">
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
