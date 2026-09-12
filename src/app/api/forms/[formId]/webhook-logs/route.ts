import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Form } from "@/types/database.types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Verify access
  const { data: form } = await client
    .from("forms")
    .select("user_id")
    .eq("id", formId)
    .single() as { data: Pick<Form, "user_id"> | null };

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

  const { data: logs } = await client
    .from("webhook_logs")
    .select("id, url, status_code, ok, error_msg, duration_ms, is_test, created_at")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(25);

  return NextResponse.json({ logs: logs ?? [] });
}
