import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// POST /api/workspace/switch — sets the active workspace cookie
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { workspaceId } = await req.json().catch(() => ({})) as { workspaceId?: string };
  if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Validate: own workspace or is actually a member
  const isOwn = workspaceId === user.id;
  if (!isOwn) {
    const { data: membership } = await client
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Sem acesso a este workspace." }, { status: 403 });
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("_df_wid", workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });

  return NextResponse.json({ ok: true });
}
