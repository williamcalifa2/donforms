import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Nome do projeto é obrigatório" }, { status: 400 });
  }

  const { ownerId } = await resolveWorkspaceContext(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: project, error } = await admin
    .from("projects")
    .insert({ user_id: ownerId, name })
    .select("id, name")
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar projeto" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, project }, { status: 201 });
}

