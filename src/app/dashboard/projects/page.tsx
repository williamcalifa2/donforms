export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspace/getWorkspaceOwner";
import type { Metadata } from "next";
import { ProjectsPageClient } from "./ProjectsPageClient";
import { ProjectsView } from "@/components/dashboard/ProjectsView";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { ownerId } = await resolveWorkspaceContext(user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: projects } = await admin
    .from("projects")
    .select("id, name, logo_url, created_at")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (projects ?? []).map(async (p: { id: string; name: string; logo_url: string | null; created_at: string }) => {
      const [{ count: formCount }, { count: clientCount }] = await Promise.all([
        admin.from("forms").select("id", { count: "exact", head: true }).eq("project_id", p.id),
        admin.from("project_clients").select("id", { count: "exact", head: true }).eq("project_id", p.id),
      ]);
      return { ...p, formCount: formCount ?? 0, clientCount: clientCount ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Projetos
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {enriched.length === 0
              ? "Nenhum projeto ainda"
              : `${enriched.length} projeto${enriched.length > 1 ? "s" : ""} no workspace`}
          </p>
        </div>
        <ProjectsPageClient />
      </div>

      {enriched.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 px-6 text-center gap-4"
          style={{ border: "2px dashed var(--card-border)" }}
        >
          <div className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-soft)", color: "var(--accent-c)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-6 w-6">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              Nenhum projeto ainda
            </p>
            <p className="text-xs max-w-xs" style={{ color: "var(--text-tertiary)" }}>
              Crie um projeto para organizar formulários por cliente e compartilhar acesso.
            </p>
          </div>
          <ProjectsPageClient />
        </div>
      ) : (
        <ProjectsView projects={enriched} />
      )}
    </div>
  );
}
