import type { AdminArea, RoleDefinition, UserRole } from "./types";

export type { AdminArea } from "./types";

/** Every admin section that can be granted to a role. */
export const ALL_AREAS: AdminArea[] = [
  "posts",
  "categories",
  "ratings",
  "catalogue",
  "sponsors",
  "homepage",
  "users",
  "pages",
  "media",
  "bulk",
  "gamification",
  "feedback",
  "analytics",
  "notifications",
  "search",
  "security",
  "settings",
  "owners",
  "payments",
];

export const AREA_LABELS: Record<AdminArea, string> = {
  posts: "Posts & blog",
  categories: "Categories",
  ratings: "Ratings & reviews",
  catalogue: "AI, apps & pricing",
  sponsors: "Sponsors & ads",
  homepage: "Homepage & quiz",
  users: "Users & access",
  pages: "Pages & menu",
  media: "Media library",
  bulk: "Bulk upload",
  gamification: "Gamification",
  feedback: "Feedback inbox",
  analytics: "Analytics & reports",
  notifications: "Notifications & email",
  search: "AI search",
  security: "Spam & security",
  settings: "Site settings",
  owners: "AI owners",
  payments: "Payments & checkout",
};

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "admin",
    name: "Super admin",
    description: "Full control of every admin section. Permissions cannot be reduced.",
    areas: ALL_AREAS,
    system: true,
  },
  {
    id: "editor",
    name: "Editor",
    description: "Writes and publishes posts, manages categories.",
    areas: ["posts", "categories"],
    system: true,
  },
  {
    id: "moderator",
    name: "Moderator",
    description: "Approves and moderates ratings and reviews.",
    areas: ["ratings"],
    system: true,
  },
  {
    id: "user",
    name: "User",
    description: "Normal account with no admin access.",
    areas: [],
    system: true,
  },
];

function cloneRole(role: RoleDefinition): RoleDefinition {
  return { ...role, areas: [...role.areas] };
}

/**
 * Merges saved roles with the built-in defaults, so a new built-in section or role
 * appears even in an older data snapshot. Super admin always keeps every section.
 */
export function resolveRoles(roles?: RoleDefinition[] | null): RoleDefinition[] {
  if (!Array.isArray(roles) || roles.length === 0) return DEFAULT_ROLES.map(cloneRole);

  const merged = DEFAULT_ROLES.map((base) => {
    const saved = roles.find((role) => role.id === base.id);
    if (!saved) return cloneRole(base);
    return {
      ...base,
      ...saved,
      name: saved.name || base.name,
      description: saved.description ?? base.description,
      areas:
        base.id === "admin"
          ? [...ALL_AREAS]
          : Array.isArray(saved.areas)
            ? saved.areas.filter((area) => ALL_AREAS.includes(area))
            : [...base.areas],
      system: true,
    };
  });

  const custom = roles
    .filter((role) => !DEFAULT_ROLES.some((base) => base.id === role.id))
    .map((role) => ({
      ...role,
      areas: Array.isArray(role.areas) ? role.areas.filter((area) => ALL_AREAS.includes(area)) : [],
    }));

  return [...merged, ...custom];
}

export function roleAreas(role: UserRole | undefined, roles?: RoleDefinition[] | null): AdminArea[] {
  if (!role) return [];
  if (role === "admin") return [...ALL_AREAS];
  const found = resolveRoles(roles).find((row) => row.id === role);
  return found ? [...found.areas] : [];
}

export function isStaffRole(role: UserRole | undefined, roles?: RoleDefinition[] | null): boolean {
  return roleAreas(role, roles).length > 0;
}

export function canAccess(
  role: UserRole | undefined,
  area: AdminArea,
  roles?: RoleDefinition[] | null,
): boolean {
  return roleAreas(role, roles).includes(area);
}

export function areasFor(role: UserRole | undefined, roles?: RoleDefinition[] | null): AdminArea[] {
  return roleAreas(role, roles);
}

export function roleLabel(role: UserRole, roles?: RoleDefinition[] | null): string {
  return resolveRoles(roles).find((row) => row.id === role)?.name ?? role;
}
