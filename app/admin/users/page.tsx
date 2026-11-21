import { toggleRoleAction } from "@/app/actions";
import { contributorBoard, formatDate } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  const db = readDb();
  const board = contributorBoard(db, 10);
  const boardIds = new Set(board.map((b) => b.user.id));
  const users = [...db.users].sort((a, b) => (b.role === "admin" ? 1 : 0) - (a.role === "admin" ? 1 : 0));
  const recent = users.slice(0, 60);
  const ratingCount = (id: string) => db.ratings.filter((r) => r.userId === id).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Users</h2>
        <p className="text-xs text-muted">
          {db.users.length.toLocaleString("en-IN")} total users (demo data me seeded reviewers bhi hain). Admin role
          toggle karke access de sakte hain.
        </p>
      </div>

      <section className="card p-4">
        <h3 className="text-sm font-bold">Top reviewers</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {board.map((row) => (
            <span key={row.user.id} className="chip bg-amber-50 text-amber-700">
              {row.user.avatar} {row.user.name} · {row.score}
            </span>
          ))}
        </div>
      </section>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Ratings</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recent.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      {u.avatar}
                    </span>
                    {u.name}
                    {boardIds.has(u.id) ? <span className="chip bg-amber-50 text-amber-700">Top</span> : null}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted">{u.email}</td>
                <td className="p-3">
                  <span className={`chip ${u.role === "admin" ? "bg-brand-soft text-brand" : "bg-slate-100 text-slate-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-xs">{ratingCount(u.id)}</td>
                <td className="p-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
                <td className="p-3 text-right">
                  <form action={toggleRoleAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="btn btn-ghost !px-2 !py-1 text-xs">
                      {u.role === "admin" ? "Make user" : "Make admin"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Pehle {recent.length} users dikhaye ja rahe hain.</p>
    </div>
  );
}
