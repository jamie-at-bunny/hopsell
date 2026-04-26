import { authClient } from "~/lib/auth-client";

export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export function canDo(role: string | undefined, permissions: Record<string, string[]>): boolean {
  if (!role) return false;
  return authClient.organization.checkRolePermission({
    role: role as Role,
    permissions,
  });
}
