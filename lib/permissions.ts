// Role & permission helpers.
// Keep all access checks centralized here.

export const ROLES = [
  "developer",
  "admin",
  "admin_gratifikasi",
  "admin_elearning",
  "admin_zi",
  "tpi_kesdm",
  "tpi_unit",
  "unit_zi",
  // Legacy roles kept for compatibility with existing accounts.
  "zi",
  "upg",
] as const;

export type Role = (typeof ROLES)[number];

export const ASSIGNABLE_ROLES = [
  "admin",
  "admin_gratifikasi",
  "admin_elearning",
  "admin_zi",
  "tpi_kesdm",
  "tpi_unit",
  "unit_zi",
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  developer: "Super Admin",
  admin: "Full Akses",
  admin_gratifikasi: "Admin Gratifikasi",
  admin_elearning: "Admin E-Learning",
  admin_zi: "Admin Zona Integritas",
  tpi_kesdm: "TPI KESDM",
  tpi_unit: "TPI Unit",
  unit_zi: "Unit ZI",
  zi: "Tim Zona Integritas",
  upg: "Tim UPG",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  developer: "Kontrol penuh seluruh sistem, akun, dan seluruh modul.",
  admin: "Akses penuh fitur gratifikasi, e-learning, dan zona integritas.",
  admin_gratifikasi: "Hanya mengelola fitur gratifikasi.",
  admin_elearning: "Hanya mengelola fitur e-learning.",
  admin_zi: "Hanya mengelola fitur zona integritas secara penuh.",
  tpi_kesdm: "Akses seluruh LKE dan review TPI KESDM, tanpa mengubah review TPI Unit.",
  tpi_unit: "Akses seluruh LKE dan review TPI Unit, tanpa mengubah review TPI KESDM.",
  unit_zi: "Akses LKE unit terkait dan pengisian data unit, tanpa mengubah review TPI.",
  zi: "Role lama untuk akses Zona Integritas.",
  upg: "Role lama untuk akses gratifikasi dan e-learning.",
};

const PERMISSIONS = {
  // Landing / dashboard
  "dashboard:admin": ["developer", "admin"],
  "dashboard:gratifikasi": ["developer", "admin", "admin_gratifikasi", "upg"],
  "dashboard:elearning": ["developer", "admin", "admin_elearning", "upg"],
  "dashboard:zi": ["developer", "admin", "admin_zi", "tpi_kesdm", "tpi_unit", "unit_zi", "zi"],

  // Account management
  "accounts:create": ["developer", "admin"],
  "accounts:manage": ["developer"],
  "register:access": ["developer", "admin"],

  // Gratifikasi
  "report:list": ["developer", "admin", "admin_gratifikasi", "upg"],

  // E-learning
  "elearning:track": ["developer", "admin", "admin_elearning", "upg"],
  "elearning:participants": ["developer", "admin", "admin_elearning", "upg"],
  "elearning:settings:manage": ["developer", "admin", "admin_elearning"],
  "elearning:participants:manage": ["developer", "admin", "admin_elearning"],

  // Zona Integritas
  "zi:access": ["developer", "admin", "admin_zi", "tpi_kesdm", "tpi_unit", "unit_zi", "zi"],
  "zi:manage": ["developer", "admin", "admin_zi", "zi"],
  "zi:delete": ["developer", "admin", "admin_zi"],
  "zi:sync": ["developer", "admin", "admin_zi", "zi"],
  "zi:ai-checker": ["developer", "admin", "admin_zi", "zi"],
  "zi:kriteria:manage": ["developer", "admin", "admin_zi"],
  "zi:scoring:manage": ["developer", "admin", "admin_zi"],
  "zi:assign-unit": ["developer", "admin", "admin_zi"],
  "zi:review-all-lke": ["developer", "admin", "admin_zi", "tpi_kesdm", "tpi_unit", "zi"],
  "zi:own-unit-only": ["unit_zi"],
  "zi:fill-unit": ["developer", "admin", "admin_zi", "unit_zi", "zi"],
  "zi:review-tpi-unit": ["developer", "admin", "admin_zi", "tpi_unit", "zi"],
  "zi:review-tpi-kesdm": ["developer", "admin", "admin_zi", "tpi_kesdm", "zi"],
  "zi:monitoring": ["developer", "admin", "admin_zi", "tpi_kesdm", "tpi_unit", "unit_zi", "zi"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

export function isPrivilegedRole(role: string | null | undefined): boolean {
  return role === "developer" || role === "admin";
}

export function getDashboardHref(role: string | null | undefined): string {
  if (!role) return "/login";
  if (hasPermission(role, "dashboard:admin")) return "/dashboard";
  if (hasPermission(role, "dashboard:zi")) return "/dashboard/zi";
  if (hasPermission(role, "dashboard:gratifikasi")) return "/dashboard/upg";
  if (hasPermission(role, "dashboard:elearning")) return "/dashboard/elearning";
  return "/login";
}

export function getCreatableRoles(
  role: string | null | undefined,
): AssignableRole[] {
  if (role === "developer") return [...ASSIGNABLE_ROLES];
  if (role === "admin") {
    return [
      "admin_gratifikasi",
      "admin_elearning",
      "admin_zi",
      "tpi_kesdm",
      "tpi_unit",
      "unit_zi",
    ];
  }
  return [];
}

export function isLegacyRole(role: string | null | undefined): boolean {
  return role === "zi" || role === "upg";
}

export function normalizeUnitName(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function canAccessZiSubmission(
  role: string | null | undefined,
  userUnitKerja: string | null | undefined,
  submission:
    | {
        eselon2?: string | null;
        assigned_unit_zi_id?: string | null;
      }
    | null
    | undefined,
  userId?: string | null | undefined,
): boolean {
  if (!submission || !hasPermission(role, "zi:access")) return false;
  if (hasPermission(role, "zi:review-all-lke")) return true;
  if (!hasPermission(role, "zi:own-unit-only")) return false;
  if (
    userId &&
    submission.assigned_unit_zi_id &&
    String(submission.assigned_unit_zi_id) === String(userId)
  ) {
    return true;
  }
  return normalizeUnitName(userUnitKerja) === normalizeUnitName(submission.eselon2);
}

export function getEditableZiJawabanFields(
  role: string | null | undefined,
): string[] {
  const fields = new Set<string>();

  if (hasPermission(role, "zi:fill-unit")) {
    fields.add("jawaban_unit");
    fields.add("narasi");
    fields.add("bukti");
    fields.add("link_drive");
  }

  if (hasPermission(role, "zi:review-tpi-unit")) {
    fields.add("jawaban_tpi_unit");
    fields.add("catatan_tpi_unit");
  }

  if (hasPermission(role, "zi:review-tpi-kesdm")) {
    fields.add("jawaban_tpi_itjen");
    fields.add("catatan_tpi_itjen");
  }

  if (hasPermission(role, "zi:manage")) {
    fields.add("ai_result.supervisi");
  }

  return [...fields];
}
