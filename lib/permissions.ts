import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { canAccess, isStaffRole, resolveRoles, roleAreas, type AdminArea } from "./roles";
import { readDb } from "./store";
import type { RoleDefinition, User } from "./types";

export { areasFor, canAccess, roleLabel } from "./roles";
export type { AdminArea } from "./roles";

export function rolesForDb(db = readDb()): RoleDefinition[] {
  return resolveRoles(db.roles);
}

/** Server-side "is this account staff at all" (any role with at least one section). */
export async function requireStaffPage(): Promise<User> {
  const user = await getCurrentUser();
  const roles = rolesForDb();
  if (!user) redirect("/login?next=/admin");
  // A signed-in account without an admin section must not go back to /login:
  // that page redirects logged-in users to /admin again, an endless loop.
  if (!isStaffRole(user.role, roles)) redirect("/?admin=no-access");
  return user;
}

/** Server guard for pages: guests go to login, staff without access to the overview. */
export async function requireAreaPage(area: AdminArea): Promise<User> {
  const user = await requireStaffPage();
  if (!canAccess(user.role, area, rolesForDb())) redirect("/admin?denied=" + area);
  return user;
}

/** Role management is reserved for the built-in super admin, so nobody can grant themselves more access. */
export async function requireSuperAdminPage(): Promise<User> {
  const user = await requireStaffPage();
  if (user.role !== "admin") redirect("/admin?denied=roles");
  return user;
}

export function userAreas(user: User, roles?: RoleDefinition[] | null): AdminArea[] {
  return roleAreas(user.role, roles ?? rolesForDb());
}
