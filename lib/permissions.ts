// ── Role & Permission System ────────────────────────────────────────────────
// Single source of truth for all role-based access control.
// Import helpers from here instead of hardcoding role checks.

export const ROLES = ["developer", "admin", "zi", "upg"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  developer: "Developer",
  admin: "Master Admin",
  zi: "Tim Zona Integritas",
  upg: "Tim UPG",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  developer: "Superadmin — kelola seluruh sistem & akun",
  admin: "Akses penuh ke seluruh sistem",
  zi: "Pengelola program WBK/WBBM",
  upg: "Pengelola laporan gratifikasi",
};

// ── Permission Map ──────────────────────────────────────────────────────────
// Each key is a permission, value is the list of roles that have it.

const PERMISSIONS = {
  // Dashboard access
  "dashboard:admin": ["developer", "admin"],
  "dashboard:upg": ["developer", "admin", "upg"],
  "dashboard:zi": ["developer", "admin", "zi"],

  // Account management
  "accounts:create": ["developer", "admin"],
  "accounts:manage": ["developer"], // edit, delete, block all users
  "accounts:create-developer": ["developer"],
  "accounts:create-admin": ["developer", "admin"],
  "accounts:create-zi": ["developer", "admin"],
  "accounts:create-upg": ["developer", "admin"],

  // Register page
  "register:access": ["developer", "admin"],

  // Gratifikasi / Report
  "report:list": ["developer", "admin", "upg"],

  // E-learning
  "elearning:track": ["developer", "admin", "upg"],
  "elearning:participants": ["developer", "admin", "upg"],

  // Zona Integritas
  "zi:check": ["developer", "admin", "zi"],
  "zi:edit": ["developer", "admin", "zi"],
  "zi:delete": ["developer", "admin"],
  "zi:monitoring": ["developer", "admin", "zi", "upg"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

export function getDashboardHref(role: string | null | undefined): string {
  if (!role) return "/login";
  if (role === "developer" || role === "admin") return "/dashboard";
  if (role === "zi") return "/dashboard/zi";
  return "/dashboard/upg";
}

/** Roles the current user is allowed to assign when registering a new account */
export function getCreatableRoles(role: string | null | undefined): Role[] {
  if (role === "developer") return ["admin", "zi", "upg"];
  if (role === "admin") return ["zi", "upg"];
  return [];
}

/** Whether a role has at least the same level of privilege as admin */
export function isPrivilegedRole(role: string | null | undefined): boolean {
  return role === "developer" || role === "admin";
}
