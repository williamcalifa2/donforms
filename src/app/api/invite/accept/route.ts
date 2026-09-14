/**
 * GET /api/invite/accept?token=XXXXXX
 * Aceita convite de workspace, seta cookie _df_wid, redireciona.
 * Route Handlers podem setar cookies — Server Components não.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/acesso?erro=token_invalido`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/acesso?next=${encodeURIComponent(`/api/invite/accept?token=${token}`)}`
    );
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const { data: inv, error: invErr } = await adminAny
    .from("workspace_invitations")
    .select("id, email, role, workspace_id, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Email mismatch — just redirect to dashboard (they're logged in as someone else)
  const emailMatch = inv.email?.toLowerCase() === user.email?.toLowerCase();
  if (!emailMatch) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // If not yet accepted — do it now
  if (!inv.accepted_at) {
    await adminAny
      .from("workspace_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    await adminAny
      .from("workspace_members")
      .upsert(
        {
          workspace_id: inv.workspace_id,
          user_id: user.id,
          role: inv.role ?? "member",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id" }
      );
  }

  // Set active workspace cookie + redirect
  const res = NextResponse.redirect(`${origin}/dashboard?welcome=1`);
  res.cookies.set("_df_wid", inv.workspace_id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
