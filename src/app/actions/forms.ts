"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext, canEditForms, canDeleteForms } from "@/lib/workspace/getWorkspaceOwner";
import type { FormField, FormSettings } from "@/types/database.types";

// Helper: supabase client sem type-checking de tabela
async function db() {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

// Helper: return admin client for cross-workspace ops, regular for own-workspace
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbFor(ownerId: string, userId: string): any {
  if (ownerId === userId) return createClient().then(c => c as any);
  // Member accessing another workspace — use admin to bypass RLS
  // (membership already verified by resolveWorkspaceContext)
  return Promise.resolve(createAdminClient() as any);
}

// ─── Criar form ───────────────────────────────────────────────────────────────
export async function createForm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await db();

  // Garante que profile existe (pode falhar silenciosamente em novos users)
  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: user.id,
      name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuário",
      email: user.email ?? "",
    },
    { onConflict: "id" }
  );
  if (profileError) {
    console.error("[createForm] profile upsert error:", JSON.stringify(profileError));
    redirect(`/dashboard?error=${encodeURIComponent("Profile: " + profileError.message)}`);
  }

  const { data: slug } = await client.rpc("generate_slug", {
    title: "Novo Formulário",
  });

  const { data: form, error } = await client
    .from("forms")
    .insert({
      user_id: user.id,
      title: "Novo Formulário",
      slug: slug ?? `form-${Date.now()}`,
      settings: {
        primaryColor: "#7D83BD",
        bgColor: "#000000",
        thankYouMessage: "Obrigado pelas respostas! 🎉",
        redirectUrl: "",
        metaPixelId: "",
        googleTagId: "",
        closeAt: null,
        maxResponses: null,
      },
    })
    .select("id")
    .single();

  if (error || !form) {
    console.error("[createForm] insert error:", JSON.stringify(error));
    redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "Erro ao criar formulário")}`);
  }

  redirect(`/dashboard/forms/${form.id}/edit`);
}

// ─── Duplicar form ────────────────────────────────────────────────────────────
export async function duplicateForm(formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { ownerId, role } = await resolveWorkspaceContext(user.id);
  if (!canEditForms(role)) return { error: "Sem permissão para duplicar formulários." };
  const client = await dbFor(ownerId, user.id);

  const { data: original, error: fetchError } = await client
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("user_id", ownerId)
    .single();

  if (fetchError || !original) return { error: "Formulário não encontrado" };

  const { data: newSlug } = await client.rpc("generate_slug", {
    title: `${original.title} (cópia)`,
  });

  const { error: insertError } = await client.from("forms").insert({
    user_id: user.id,
    title: `${original.title} (cópia)`,
    slug: newSlug ?? `form-copy-${Date.now()}`,
    fields: original.fields,
    settings: original.settings,
    is_published: false,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Salvar form ──────────────────────────────────────────────────────────────
export async function saveForm(
  formId: string,
  payload: { title: string; fields: FormField[]; settings: FormSettings },
  prevPayload?: { title: string; fields: FormField[] }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { ownerId, role } = await resolveWorkspaceContext(user.id);
  if (!canEditForms(role)) return { error: "Sem permissão para editar formulários." };
  const client = await dbFor(ownerId, user.id);
  const { error } = await client
    .from("forms")
    .update({
      title: payload.title.trim() || "Sem título",
      fields: payload.fields,
      settings: payload.settings,
    })
    .eq("id", formId)
    .eq("user_id", ownerId);

  if (error) return { error: error.message };

  // ── Registrar histórico de alterações ──────────────────────────────────────
  try {
    const summaries: string[] = [];
    if (prevPayload) {
      if (prevPayload.title !== payload.title.trim()) {
        summaries.push(`Título alterado para "${payload.title.trim() || "Sem título"}"`);
      }
      const prevIds = prevPayload.fields.map(f => f.id);
      const newIds = payload.fields.map(f => f.id);
      const added = payload.fields.filter(f => !prevIds.includes(f.id));
      const removed = prevPayload.fields.filter(f => !newIds.includes(f.id));
      const edited = payload.fields.filter(f => {
        const prev = prevPayload.fields.find(p => p.id === f.id);
        return prev && prev.label !== f.label;
      });
      for (const f of added) summaries.push(`Campo adicionado: "${f.label}"`);
      for (const f of removed) summaries.push(`Campo removido: "${f.label}"`);
      for (const f of edited) summaries.push(`Campo renomeado: "${f.label}"`);
    }
    const summary = summaries.length > 0 ? summaries.join(" · ") : "Form salvo";
    await client.from("form_history").insert({
      form_id: formId,
      user_id: user.id,
      summary,
    });
  } catch { /* histórico é best-effort */ }

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Buscar histórico de alterações ──────────────────────────────────────────
export async function getFormHistory(formId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const client = await db();
  const { data } = await client
    .from("form_history")
    .select("id, created_at, summary, user_id, profiles(name, email)")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as {
    id: string;
    created_at: string;
    summary: string;
    user_id: string;
    profiles: { name: string; email: string } | null;
  }[];
}

// ─── Toggle publicação ────────────────────────────────────────────────────────
export async function togglePublish(formId: string, publish: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { ownerId, role } = await resolveWorkspaceContext(user.id);
  if (!canEditForms(role)) return { error: "Sem permissão para publicar formulários." };
  const client = await dbFor(ownerId, user.id);
  const { error } = await client
    .from("forms")
    .update({ is_published: publish })
    .eq("id", formId)
    .eq("user_id", ownerId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Renomear form ────────────────────────────────────────────────────────────
export async function renameForm(formId: string, title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { ownerId, role } = await resolveWorkspaceContext(user.id);
  if (!canEditForms(role)) return { error: "Sem permissão para renomear formulários." };
  const client = await dbFor(ownerId, user.id);
  const { error } = await client
    .from("forms")
    .update({ title: title.trim() || "Sem título" })
    .eq("id", formId)
    .eq("user_id", ownerId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Atualizar status de submissão (kanban) ───────────────────────────────────
export async function updateSubmissionStatus(submissionId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const client = await db();
  // RLS garante que só o dono do form pode atualizar
  const { error } = await client
    .from("submissions")
    .update({ status })
    .eq("id", submissionId);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Deletar form ─────────────────────────────────────────────────────────────
export async function deleteForm(formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { ownerId, role } = await resolveWorkspaceContext(user.id);
  if (!canDeleteForms(role)) redirect("/dashboard?error=Sem+permiss%C3%A3o+para+deletar+formul%C3%A1rios");
  const client = await dbFor(ownerId, user.id);
  await client.from("forms").delete().eq("id", formId).eq("user_id", ownerId);

  redirect("/dashboard");
}
