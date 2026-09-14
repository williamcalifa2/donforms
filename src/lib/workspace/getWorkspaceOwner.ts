/**
 * Resolve the effective workspace owner user_id for queries.
 *
 * Members access forms/responses/etc via the _df_wid cookie which stores
 * the workspace owner's user_id. We verify actual membership before trusting it.
 *
 * Returns:
 *   - workspace owner's user_id  (member viewing another workspace's data)
 *   - current user's id          (owner, or cookie missing/invalid)
 */
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getEffectiveOwnerId(currentUserId: string): Promise<string> {
  const cookieStore = await cookies();
  const wid = cookieStore.get("_df_wid")?.value;

  // No cookie or cookie matches self → owner mode
  if (!wid || wid === currentUserId) return currentUserId;

  // Verify user is actually a member of that workspace
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", wid)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!membership) return currentUserId; // not a member, fall back

  return wid; // workspace owner's user_id → query forms WHERE user_id = wid
}
