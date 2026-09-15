/**
 * Workspace context utilities.
 *
 * workspace_id in DB = workspace owner's user_id.
 * _df_wid cookie = active workspace (may differ from current user's own id for members).
 *
 * Permission model:
 *   - Owner: all permissions, always.
 *   - Others: role gives a preset; workspace_members.permissions (jsonb) overrides
 *     individual bits. If permissions column is null → fall back to role preset.
 */
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspacePermissions } from "@/types/database.types";
import {
  type WorkspaceRole,
  ROLE_PRESETS,
  OWNER_PERMISSIONS,
  resolvePermissions,
} from "@/lib/workspace/permissions";

// Re-export for callers that import from this module
export type { WorkspaceRole };
export { ROLE_PRESETS, OWNER_PERMISSIONS, resolvePermissions };

export interface WorkspaceContext {
  /** user_id of the workspace owner — use this to query forms/submissions */
  ownerId: string;
  /** true if the current user IS the workspace owner */
  isOwner: boolean;
  /** current user's role label in the active workspace */
  role: WorkspaceRole;
  /** effective resolved permissions (role preset merged with custom overrides) */
  permissions: WorkspacePermissions;
}

// ─── Context resolution ───────────────────────────────────────────────────────

/**
 * Resolve full workspace context for the current request.
 * Reads _df_wid cookie, verifies membership, returns ownerId + role + permissions.
 * Falls back to the user's own workspace (owner) if cookie is missing or invalid.
 */
export async function resolveWorkspaceContext(currentUserId: string): Promise<WorkspaceContext> {
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value;

  if (!wid || wid === currentUserId) {
    return {
      ownerId: currentUserId,
      isOwner: true,
      role: "owner",
      permissions: OWNER_PERMISSIONS,
    };
  }

  // Verify actual membership + fetch role & custom permissions
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from("workspace_members")
    .select("role, permissions")
    .eq("workspace_id", wid)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!membership) {
    // Cookie exists but user is not actually a member — fall back to own workspace
    return {
      ownerId: currentUserId,
      isOwner: true,
      role: "owner",
      permissions: OWNER_PERMISSIONS,
    };
  }

  const role = membership.role as WorkspaceRole;
  const permissions = resolvePermissions(role, membership.permissions ?? null);

  return { ownerId: wid, isOwner: false, role, permissions };
}

/**
 * Resolve just the effective owner id (shorthand for queries).
 */
export async function getEffectiveOwnerId(currentUserId: string): Promise<string> {
  const ctx = await resolveWorkspaceContext(currentUserId);
  return ctx.ownerId;
}

/**
 * Return the role of a user in a specific workspace.
 * Returns null if not a member.
 */
export async function getWorkspaceMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  if (workspaceId === userId) return "owner";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

// ─── Permission helpers (use resolved permissions, not just role) ─────────────

export function canManageTeam(p: WorkspacePermissions): boolean {
  return p.team_manage;
}

export function canEditForms(p: WorkspacePermissions): boolean {
  return p.forms_edit;
}

export function canCreateForms(p: WorkspacePermissions): boolean {
  return p.forms_create;
}

export function canDeleteForms(p: WorkspacePermissions): boolean {
  return p.forms_delete;
}

export function canViewResponses(p: WorkspacePermissions): boolean {
  return p.responses_view;
}

export function canExportResponses(p: WorkspacePermissions): boolean {
  return p.responses_export;
}

export function canViewAnalytics(p: WorkspacePermissions): boolean {
  return p.analytics_view;
}

// ─── API to update member permissions ────────────────────────────────────────

/**
 * Update a member's custom permissions in the DB.
 * Pass null to reset to role preset.
 */
export async function setMemberPermissions(
  workspaceId: string,
  memberId: string,
  permissions: WorkspacePermissions | null
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("workspace_members")
    .update({ permissions })
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberId);

  return { error: error?.message ?? null };
}

/**
 * Update a member's role (and reset custom permissions).
 */
export async function setMemberRole(
  workspaceId: string,
  memberId: string,
  role: Exclude<WorkspaceRole, "owner">
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("workspace_members")
    .update({ role, permissions: null }) // reset custom perms when role changes
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberId);

  return { error: error?.message ?? null };
}
