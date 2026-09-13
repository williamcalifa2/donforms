import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FormSettings } from "@/types/database.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.settingsPatch) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  // Verify ownership or workspace membership
  const { data: form } = await client
    .from("forms")
    .select("user_id, settings")
    .eq("id", formId)
    .single();

  if (!form) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const isOwner = form.user_id === user.id;
  if (!isOwner) {
    const { data: membership } = await client
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", form.user_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  // Merge patch into existing settings
  const newSettings: FormSettings = { ...form.settings, ...body.settingsPatch };

  const { error } = await client
    .from("forms")
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq("id", formId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, settings: newSettings });
}
