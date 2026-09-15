/**
 * Workspace context utilities.
 *
 * workspace_id in DB = workspace owner's user_id.
 * _df_wid cookie = active workspace (may differ from current user's own id for members).
 *
 * All helpers verify membership before trusting the cookie.
 * Admin client used so queries work regardless of RLS.
 */
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceContext {
  /** user_id of the workspace owner — use this to query forms/submissions */
  ownerId: string;
  /** true if the current user IS the workspace owner */
  isOwner: boolean;
  /** current user's effective role in the active workspace */
  role: WorkspaceRole;
}

/**
 * Resolve full workspace context for the current request.
 * Reads _df_wid cookie, verifies membership, returns ownerId + role.
 * Falls back to the user's own workspace (owner) if cookie is missing or invalid.
 */
export async function resolveWorkspaceContext(currentUserId: string): Promise<WorkspaceContext> {
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value;

  if (!wid || wid === currentUserId) {
    return { ownerId: currentUserId, isOwner: true, role: "owner" };
  }

  // Verify actual membership
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wid)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!membership) {
    // Cookie exists but user is not actually a member — fall back to own workspace
    return { ownerId: currentUserId, isOwner: true, role: "owner" };
  }

  return {
    ownerId: wid,
    isOwner: false,
    role: membership.role as WorkspaceRole,
  };
}

/**
 * Resolve just the effective owner id (shorthand for queries).
 * Membership is verified before trusting the cookie.
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

/**
 * True if the role can manage team (invite / remove members).
 */
export function canManageTeam(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * True if the role can edit forms (save, publish, rename, duplicate).
 */
export function canEditForms(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

/**
 * True if the role can delete forms.
 */
export function canDeleteForms(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}
