/**
 * Pure permission constants — no server imports.
 * Safe to import from both server and client components.
 */
import type { WorkspacePermissions } from "@/types/database.types";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_PRESETS: Record<Exclude<WorkspaceRole, "owner">, WorkspacePermissions> = {
  admin: {
    forms_view: true,
    forms_create: true,
    forms_edit: true,
    forms_publish: true,
    forms_delete: true,
    responses_view: true,
    responses_export: true,
    analytics_view: true,
    team_manage: true,
  },
  member: {
    forms_view: true,
    forms_create: true,
    forms_edit: true,
    forms_publish: true,
    forms_delete: true,
    responses_view: true,
    responses_export: true,
    analytics_view: true,
    team_manage: false,
  },
  viewer: {
    forms_view: true,
    forms_create: false,
    forms_edit: false,
    forms_publish: false,
    forms_delete: false,
    responses_view: true,
    responses_export: false,
    analytics_view: true,
    team_manage: false,
  },
};

export const OWNER_PERMISSIONS: WorkspacePermissions = {
  forms_view: true,
  forms_create: true,
  forms_edit: true,
  forms_publish: true,
  forms_delete: true,
  responses_view: true,
  responses_export: true,
  analytics_view: true,
  team_manage: true,
};

/**
 * Merge role preset with custom DB overrides.
 * null custom = use preset as-is.
 */
export function resolvePermissions(
  role: WorkspaceRole,
  custom: WorkspacePermissions | null
): WorkspacePermissions {
  if (role === "owner") return OWNER_PERMISSIONS;
  const preset = ROLE_PRESETS[role] ?? ROLE_PRESETS.viewer;
  if (!custom) return preset;
  return { ...preset, ...custom };
}
