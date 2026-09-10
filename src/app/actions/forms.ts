"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormField, FormSettings } from "@/types/database.types";

// Helper: supabase client sem type-checking de tabela
// (usar até gerar tipos via `npm run db:types` com Supabase CLI)
async function db() {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

// ─── Criar form ───────────────────────────────────────────────────────────────
export async function createForm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await db();

  const { data: slug } = await client.rpc("generate_slug", {
    title: "Novo Formulário",
  });

  const { data: form, error } = await client
    .from("forms")
    .insert({
      user_id: user.id,
      title: "Novo Formulário",
      slug: slug ?? `form-${Date.now()}`,
    })
    .select("id")
    .single();

  if (error || !form) redirect("/dashboard?error=Erro+ao+criar+formulário");

  redirect(`/dashboard/forms/${form.id}/edit`);
}

// ─── Salvar form ──────────────────────────────────────────────────────────────
export async function saveForm(
  formId: string,
  payload: { title: string; fields: FormField[]; settings: FormSettings }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const client = await db();
  const { error } = await client
    .from("forms")
    .update({
      title: payload.title.trim() || "Sem título",
      fields: payload.fields,
      settings: payload.settings,
    })
    .eq("id", formId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Toggle publicação ────────────────────────────────────────────────────────
export async function togglePublish(formId: string, publish: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const client = await db();
  const { error } = await client
    .from("forms")
    .update({ is_published: publish })
    .eq("id", formId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─── Deletar form ─────────────────────────────────────────────────────────────
export async function deleteForm(formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await db();
  await client.from("forms").delete().eq("id", formId).eq("user_id", user.id);

  redirect("/dashboard");
}
