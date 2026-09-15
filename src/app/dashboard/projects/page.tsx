export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { ProjectsPageClient } from "./ProjectsPageClient";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: projects } = await admin
    .from("projects")
    .select("id, name, logo_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // For each project, count forms and clients
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pastas de formulários para seus clientes</p>
        </div>
        <ProjectsPageClient />
      </div>

      {enriched.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 text-center gap-3 text-muted-foreground">
          <p className="text-sm font-medium">Nenhum projeto ainda</p>
          <p className="text-xs max-w-xs">Crie um projeto para organizar formulários por cliente e compartilhar acesso.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map(p => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}
              className="border rounded-xl p-5 hover:border-primary/30 transition-colors group block">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}>
                  {p.logo_url
                    ? <img src={p.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    : p.name.slice(0, 2).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.formCount} form{p.formCount !== 1 ? "s" : ""} · {p.clientCount} cliente{p.clientCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
