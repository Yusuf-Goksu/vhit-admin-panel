export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  DOCTOR: "doctor",
} as const;

export function isAdminRole(role?: string | null) {
  return role === USER_ROLES.SUPER_ADMIN;
}