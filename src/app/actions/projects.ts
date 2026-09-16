"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormField, FormSettings } from "@/types/database.types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

function genToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_FORM_SETTINGS: FormSettings = {
  primaryColor: "#7D83BD",
  bgColor: "#000000",
  thankYouMessage: "Obrigado pelas respostas! 🎉",
  redirectUrl: "",
  metaPixelId: "",
  googleTagId: "",
  closeAt: null,
  maxResponses: null,
  logoUrl: null,
};

// ── Project CRUD ───────────────────────────────────────────────────────────────

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

export async function renameProject(projectId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin
    .from("projects")
    .update({ name: name.trim() || "Sem nome" })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/projects");
  return { error: null };
}

export async function uploadProjectLogo(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", url: null };

  const file = formData.get("logo") as File | null;
  if (!file || !file.size) return { error: "Arquivo não enviado", url: null };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `project-logos/${projectId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("form-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message, url: null };

  const { data: urlData } = supabase.storage.from("form-assets").getPublicUrl(path);
  const url = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
  if (!url) return { error: "Erro ao obter URL", url: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  await admin.from("projects").update({ logo_url: url }).eq("id", projectId).eq("user_id", user.id);

  revalidatePath("/dashboard/projects");
  return { error: null, url };
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

// ── Client management ──────────────────────────────────────────────────────────

export async function inviteProjectClient(_prev: unknown, formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!clientName) return { error: "Nome obrigatório", token: null };
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Email inválido", token: null };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", token: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: project } = await admin
    .from("projects")
    .select("id, name, logo_url")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return { error: "Projeto não encontrado", token: null };

  const token = genToken();
  const { error } = await admin
    .from("project_clients")
    .insert({ project_id: projectId, client_name: clientName, client_email: clientEmail, token });

  if (error) return { error: error.message, token: null };

  // Send invite email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const portalUrl = `${APP_URL}/c/${token}`;

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const senderName = senderProfile?.name ?? user.email ?? "DonForms";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `DonForms <${fromEmail}>`,
        to: [clientEmail],
        subject: `${senderName} compartilhou o projeto "${project.name}" com você`,
        html: `
          <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;background:#06060e;padding:40px 32px;border-radius:16px;">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#9ea8ff,#7c87ff);display:flex;align-items:center;justify-content:center;margin-bottom:28px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10H12.5L13 2z"/></svg>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#f0f2ff;margin:0 0 10px;">Você foi convidado para o projeto</h1>
            <p style="font-size:15px;color:#8b90b8;line-height:1.6;margin:0 0 24px;">
              <strong style="color:#c8ccf0;">${senderName}</strong> compartilhou o projeto
              <strong style="color:#9ea8ff;">${project.name}</strong> com você, ${clientName}.
            </p>
            <p style="font-size:14px;color:#8b90b8;line-height:1.6;margin:0 0 24px;">
              Você tem acesso completo para criar formulários, visualizar respostas e analisar métricas.
            </p>
            <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#9ea8ff,#7c87ff);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:24px;">
              Acessar projeto →
            </a>
            <p style="margin:0;font-size:12px;color:#3d4060;line-height:1.6;">
              Ou copie este link: <span style="color:#9ea8ff;">${portalUrl}</span>
            </p>
          </div>
        `,
      }),
    }).catch(() => null);
  }

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

// ── Form creation ──────────────────────────────────────────────────────────────

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
      settings: DEFAULT_FORM_SETTINGS,
    })
    .select("id")
    .single();

  if (error || !form) {
    redirect(`/dashboard/projects/${projectId}?error=${encodeURIComponent(error?.message ?? "Erro")}`);
  }

  redirect(`/dashboard/forms/${form.id}/edit`);
}

// Creates a form on behalf of a client (token-based, no user auth required)
export async function createProjectFormAsClient(token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: clientRow } = await admin
    .from("project_clients")
    .select("project_id, projects(id, user_id)")
    .eq("token", token)
    .single();

  if (!clientRow) redirect(`/c/${token}`);

  const projectId = clientRow.project_id as string;
  const userId = (clientRow.projects as { id: string; user_id: string }).user_id;

  const { data: slug } = await admin.rpc("generate_slug", { title: "Novo Formulário" });

  const { data: form, error } = await admin
    .from("forms")
    .insert({
      user_id: userId,
      project_id: projectId,
      title: "Novo Formulário",
      slug: slug ?? `form-${Date.now()}`,
      settings: DEFAULT_FORM_SETTINGS,
    })
    .select("id")
    .single();

  if (error || !form) redirect(`/c/${token}`);

  redirect(`/c/${token}/forms/${form.id}/edit`);
}

// Token-aware save (used by FormEditor in client portal)
export async function saveFormAsClient(
  token: string,
  formId: string,
  payload: { title: string; fields: FormField[]; settings: FormSettings },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Verify token owns the project that owns this form
  const { data: clientRow } = await admin
    .from("project_clients")
    .select("project_id")
    .eq("token", token)
    .single();

  if (!clientRow) return { error: "Token inválido" };

  const { data: form } = await admin
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("project_id", clientRow.project_id)
    .single();

  if (!form) return { error: "Sem permissão" };

  const { error } = await admin
    .from("forms")
    .update({
      title: payload.title.trim() || "Sem título",
      fields: payload.fields,
      settings: payload.settings,
    })
    .eq("id", formId);

  if (error) return { error: error.message };

  revalidatePath(`/c/${token}/forms/${formId}/edit`);
  return { error: null };
}

// Token-aware publish toggle
export async function togglePublishAsClient(token: string, formId: string, publish: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: clientRow } = await admin
    .from("project_clients")
    .select("project_id")
    .eq("token", token)
    .single();

  if (!clientRow) return { error: "Token inválido" };

  const { data: form } = await admin
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("project_id", clientRow.project_id)
    .single();

  if (!form) return { error: "Sem permissão" };

  const { error } = await admin
    .from("forms")
    .update({ is_published: publish })
    .eq("id", formId);

  if (error) return { error: error.message };

  revalidatePath(`/c/${token}/forms/${formId}/edit`);
  revalidatePath(`/c/${token}`);
  return { error: null };
}
