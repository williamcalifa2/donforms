import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/workspace/invitations/[id] — owner revokes a pending invitation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { error } = await client
    .from("workspace_invitations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
