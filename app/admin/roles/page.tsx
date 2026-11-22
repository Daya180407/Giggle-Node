import Link from "next/link";
import { deleteRoleAction, saveRoleAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { requireSuperAdminPage } from "@/lib/permissions";
import { ALL_AREAS, AREA_LABELS, resolveRoles } from "@/lib/roles";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function PermissionGrid({ role }: { role: { id: string; areas: string[]; system?: boolean } }) {
  const locked = role.id === "admin" || role.id === "user";
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {ALL_AREAS.map((area) => (
        <label
          key={area}
          className={`flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12px] ${
            locked ? "bg-slate-50 text-slate-500" : "bg-white"
          }`}
        >
          <input
            type="checkbox"
            name="areas"
            value={area}
            defaultChecked={role.areas.includes(area)}
            disabled={locked}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          {AREA_LABELS[area]}
        </label>
      ))}
    </div>
  );
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireSuperAdminPage();
  const { saved, error } = await searchParams;
  const db = readDb();
  const roles = resolveRoles(db.roles);
  const staff = db.users.filter((user) => user.role !== "user").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="display mt-1 text-2xl text-ink">Roles &amp; permissions</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Create a role (Editor, Manager, Support…), tick the admin sections it can use, then assign it to an account
            from the Users page. Only a super admin can edit roles.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip bg-brand-soft text-brand">{roles.length} roles</span>
          <span className="chip bg-emerald-50 text-emerald-700">{staff} staff accounts</span>
          <Link href="/admin/users" className="btn btn-ghost !py-1.5 text-xs">
            Assign roles →
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Roles updated. Permission changes apply immediately.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error === "system"
            ? "Built-in roles cannot be deleted. Only custom roles can be removed."
            : "A role name is required."}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {roles.map((role) => {
          const users = db.users.filter((user) => user.role === role.id).length;
          const locked = role.id === "admin" || role.id === "user";
          return (
            <article key={role.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold">{role.name}</h3>
                <span className="chip bg-slate-100 text-slate-500">{role.id}</span>
                <span className={`chip ${role.system ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {role.system ? "Built-in" : "Custom"}
                </span>
                <span className="ml-auto text-[11px] text-muted">{users} users</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {role.areas.length} of {ALL_AREAS.length} admin sections
                {locked ? " · fixed for this role" : ""}
              </p>

              <form action={saveRoleAction} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={role.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor={`name-${role.id}`}>
                      Role name
                    </label>
                    <input
                      id={`name-${role.id}`}
                      name="name"
                      defaultValue={role.name}
                      required
                      maxLength={40}
                      className="field !py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`desc-${role.id}`}>
                      Description
                    </label>
                    <input
                      id={`desc-${role.id}`}
                      name="description"
                      defaultValue={role.description}
                      maxLength={200}
                      className="field !py-1.5 text-xs"
                    />
                  </div>
                </div>
                <PermissionGrid role={role} />
                {locked ? (
                  <p className="text-[11px] text-muted">
                    {role.id === "admin"
                      ? "Super admin always keeps every section."
                      : "Normal users never get admin sections."}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-primary !py-1.5 text-xs">Save role</button>
                  {!role.system ? (
                    <span className="text-[11px] text-muted">
                      {users ? `${users} users will move to User if deleted.` : "No users assigned."}
                    </span>
                  ) : null}
                </div>
              </form>

              {!role.system ? (
                <form action={deleteRoleAction} className="mt-2 border-t border-line/70 pt-2">
                  <input type="hidden" name="id" value={role.id} />
                  <DeleteButton
                    label="Delete this role"
                    message={`Delete ${role.name}? ${users} users will become "User".`}
                  />
                </form>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="card border-dashed border-indigo-200 p-4">
        <h3 className="text-sm font-bold">+ Create a role</h3>
        <p className="mt-1 text-xs text-muted">
          Example: give “Content manager” Posts + Categories + Media, or “Support” Feedback + Analytics.
        </p>
        <form action={saveRoleAction} className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-role-name">
                Role name *
              </label>
              <input
                id="new-role-name"
                name="name"
                required
                maxLength={40}
                placeholder="Content manager"
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="new-role-desc">
                Description
              </label>
              <input
                id="new-role-desc"
                name="description"
                maxLength={200}
                placeholder="What this role is for"
                className="field !py-2 text-xs"
              />
            </div>
          </div>
          <PermissionGrid role={{ id: "new", areas: [] }} />
          <button className="btn btn-primary !py-2 text-xs">Create role</button>
        </form>
      </section>
    </div>
  );
}
