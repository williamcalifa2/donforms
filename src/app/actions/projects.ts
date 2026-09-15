"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function genToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function createProject(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome obrigatório" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: project, error } = await admin
    .from("projects")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();

  if (error || !project) return { error: error?.message ?? "Erro ao criar projeto" };

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  await admin.from("projects").delete().eq("id", projectId).eq("user_id", user.id);

  revalidatePath("/dashboard/projects");
  return { error: null };
}

export async function inviteProjectClient(_prev: unknown, formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!clientName) return { error: "Nome obrigatório", token: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", token: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return { error: "Projeto não encontrado", token: null };

  const token = genToken();
  const { error } = await admin
    .from("project_clients")
    .insert({ project_id: projectId, client_name: clientName, client_email: clientEmail, token });

  if (error) return { error: error.message, token: null };

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { error: null, token };
}

export async function removeProjectClient(clientId: string, projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  await admin.from("project_clients").delete().eq("id", clientId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { error: null };
}

export async function createProjectForm(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: slug } = await admin.rpc("generate_slug", { title: "Novo Formulário" });

  const { data: form, error } = await admin
    .from("forms")
    .insert({
      user_id: user.id,
      project_id: projectId,
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
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(error?.message ?? "Erro")}`);
  }

  redirect(`/dashboard/forms/${form.id}/edit`);
}
