import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";

// DELETE /api/workspace/members/[userId] — owner/admin removes a member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { ownerId, role } = await resolveWorkspaceContext(user.id);

  // Only owner/admin can remove members
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para remover membros." }, { status: 403 });
  }

  // Cannot remove the workspace owner
  if (userId === ownerId) {
    return NextResponse.json({ error: "Não é possível remover o dono do workspace." }, { status: 400 });
  }

  // Use admin client to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", ownerId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
