import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteRatingAction,
  deleteUserAction,
  deleteUserRatingsAction,
  saveUserProfileAction,
} from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { requireAreaPage } from "@/lib/permissions";
import { formatDate, timeAgo } from "@/lib/rank";
import { resolveRoles, roleLabel } from "@/lib/roles";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; removed?: string; error?: string }>;
}) {
  await requireAreaPage("users");
  const { id } = await params;
  const { saved, removed, error } = await searchParams;
  const db = readDb();
  const roles = resolveRoles(db.roles);
  const user = db.users.find((row) => row.id === id);
  if (!user) notFound();

  const admin = await getCurrentUser();
  const self = admin?.id === user.id;
  const canManageAccess = admin?.role === "admin";
  const ratings = db.ratings
    .filter((row) => row.userId === user.id)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const reviews = ratings.filter((row) => row.review && row.review.trim().length > 0).length;
  const points = (db.pointEvents ?? [])
    .filter((row) => row.userId === user.id)
    .reduce((sum, row) => sum + row.points, 0);
  const bookmarks = db.bookmarks.filter((row) => row.userId === user.id).length;
  const follows = db.follows.filter((row) => row.userId === user.id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-extrabold text-white">
            {user.avatar}
          </span>
          <div>
            <h2 className="text-lg font-bold">{user.name}</h2>
            <p className="text-xs text-muted">
              {user.email} · {roleLabel(user.role, roles)} · joined {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="btn btn-ghost text-xs">
            ← All users
          </Link>
          <Link href="/admin/ratings" className="btn btn-ghost text-xs">
            Moderate ratings →
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Profile updated. Changes are live on the site.
        </div>
      ) : null}
      {removed ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          {removed} ratings removed for this user.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "email"
            ? "That email is already used by another account."
            : error === "password"
              ? "New password must be at least 8 characters."
              : "Name and a valid email are required."}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Ratings", value: ratings.length },
          { label: "Reviews", value: reviews },
          { label: "Points", value: points },
          { label: "Saved", value: bookmarks },
          { label: "Following", value: follows },
          { label: "Status", value: user.banned ? "Banned" : "Active" },
        ].map((card) => (
          <div key={card.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-4">
          <h3 className="text-sm font-bold">Admin controls</h3>
          <p className="mt-1 text-xs text-muted">
            Name, email, avatar, role, verified badge, ban status aur password — sab yahan se control karein.
          </p>
          <form action={saveUserProfileAction} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={user.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  Display name
                </label>
                <input id="name" name="name" required defaultValue={user.name} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input id="email" name="email" type="email" required defaultValue={user.email} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="avatar">
                  Avatar / initial
                </label>
                <input id="avatar" name="avatar" maxLength={4} defaultValue={user.avatar} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue={user.role}
                  disabled={self || !canManageAccess}
                  className="field disabled:opacity-60"
                >
                  {roles.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                {self ? <input type="hidden" name="role" value={user.role} /> : null}
              </div>
              <div>
                <label className="label" htmlFor="newPassword">
                  Set a new password (optional)
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Khali chhodein = unchanged"
                  className="field"
                />
              </div>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="verified"
                    defaultChecked={user.verified}
                    disabled={self || !canManageAccess}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Verified reviewer badge
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="banned"
                    defaultChecked={user.banned}
                    disabled={self || !canManageAccess}
                    className="h-4 w-4 accent-rose-600"
                  />
                  Ban this account
                </label>
              </div>
            </div>
            {self || !canManageAccess ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                {self
                  ? "Apna role ya ban status change nahi kar sakte — doosre super admin se karayein."
                  : "Role, verified badge aur ban sirf super admin change kar sakta hai."}
              </p>
            ) : null}
            <button className="btn btn-primary !py-2 text-xs">Save profile</button>
          </form>
        </section>

        <aside className="space-y-3">
          <section className="card p-4">
            <h3 className="text-sm font-bold">Account state</h3>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">User id</dt>
                <dd className="truncate font-mono text-[10px]">{user.id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Member since</dt>
                <dd>{timeAgo(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Verified</dt>
                <dd>{user.verified ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Banned</dt>
                <dd>{user.banned ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Seed account</dt>
                <dd>{user.isSeed ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </section>

          <section className="card border-rose-200 p-4">
            <h3 className="text-sm font-bold text-rose-700">Danger zone</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Delete ratings se ranking update ho jayegi. Account delete karne par ratings, bookmarks aur follows bhi
              hat jayenge.
            </p>
            <form action={deleteUserRatingsAction} className="mt-2">
              <input type="hidden" name="id" value={user.id} />
              <DeleteButton
                label={`Delete all ${ratings.length} ratings`}
                message={`${user.name} ki saari ratings delete ho jayengi. Pakka?`}
              />
            </form>
            {!self ? (
              <form action={deleteUserAction} className="mt-2">
                <input type="hidden" name="id" value={user.id} />
                <DeleteButton
                  label="Delete this account"
                  message={`${user.name} ka account aur activity permanently delete hogi. Pakka?`}
                />
              </form>
            ) : null}
          </section>
        </aside>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Recent ratings ({ratings.length})</h3>
          <Link href={`/admin/ratings?q=${encodeURIComponent(user.email)}`} className="text-[11px] font-semibold text-brand">
            Open in ratings →
          </Link>
        </div>
        <div className="mt-2 divide-y divide-line">
          {ratings.slice(0, 10).map((row) => {
            const model = db.models.find((m) => m.id === row.modelId);
            const ai = model ? db.ai.find((a) => a.id === model.aiId) : undefined;
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {model?.name ?? "Deleted model"}
                    {ai ? <span className="font-normal text-muted"> · {ai.name}</span> : null}
                  </p>
                  <p className="text-[10.5px] text-muted">
                    {timeAgo(row.updatedAt)} · {row.status ?? "approved"}
                  </p>
                  {row.review ? <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">“{row.review}”</p> : null}
                </div>
                <Stars value={row.stars} size={12} />
                <form action={deleteRatingAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="back" value={`/admin/users/${user.id}`} />
                  <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
                </form>
              </div>
            );
          })}
          {ratings.length === 0 ? <p className="py-4 text-sm text-muted">This user has not rated anything yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
