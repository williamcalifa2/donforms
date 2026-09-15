import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";

// DELETE /api/workspace/invitations/[id] — owner/admin revokes a pending invitation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { ownerId, role } = await resolveWorkspaceContext(user.id);

  // Only owner/admin can revoke invitations
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para cancelar convites." }, { status: 403 });
  }

  // Use admin client to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { error } = await admin
    .from("workspace_invitations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ownerId);   // ← scoped to active workspace only

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
