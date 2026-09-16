export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { NewFormButton, ProjectSettingsButton } from "./ProjectDetailClient";
import type { FormWithCount } from "@/types/database.types";

export const metadata: Metadata = { title: "Projeto" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: project } = await admin
    .from("projects")
    .select("id, name, logo_url, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const [{ data: forms }, { data: clients }] = await Promise.all([
    admin
      .from("forms_with_submission_count")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("project_clients")
      .select("id, client_name, client_email, token, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const formList = (forms ?? []) as FormWithCount[];
  const clientList = (clients ?? []) as {
    id: string; client_name: string; client_email: string; token: string; created_at: string;
  }[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Projetos
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}>
            {project.logo_url
              ? <img src={project.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
              : project.name.slice(0, 2).toUpperCase()
            }
          </div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
        </div>
      </div>

      {/* Forms section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Formulários</h2>
          <div className="flex items-center gap-2">
            <ProjectSettingsButton projectId={id} projectName={project.name} projectLogoUrl={project.logo_url} clients={clientList} appUrl={APP_URL} />
            <NewFormButton projectId={id} />
          </div>
        </div>

        {formList.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
            <p className="text-sm">Nenhum formulário ainda</p>
            <p className="text-xs">Crie o primeiro formulário para este projeto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formList.map(form => (
              <div key={form.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm truncate">{form.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {form.submission_count ?? 0} resposta{(form.submission_count ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    form.is_published ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {form.is_published ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/forms/${form.id}/edit`}
                    className="text-xs px-2.5 py-1.5 rounded-md border hover:bg-accent transition-colors">
                    Editar
                  </Link>
                  <Link href={`/dashboard/forms/${form.id}/responses`}
                    className="text-xs px-2.5 py-1.5 rounded-md border hover:bg-accent transition-colors">
                    Respostas
                  </Link>
                  <Link href={`/dashboard/forms/${form.id}/analytics`}
                    className="text-xs px-2.5 py-1.5 rounded-md border hover:bg-accent transition-colors">
                    Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
