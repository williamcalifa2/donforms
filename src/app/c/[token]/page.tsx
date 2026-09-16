export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { NewFormClientButton } from "./NewFormClientButton";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("project_clients")
    .select("project_id, projects(name)")
    .eq("token", token)
    .single();
  const name = data?.projects?.name ?? "Portal";
  return { title: name };
}

export default async function ClientPortalPage({ params }: Props) {
  const { token } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: client } = await admin
    .from("project_clients")
    .select("id, client_name, project_id, projects(id, name, logo_url)")
    .eq("token", token)
    .single();

  if (!client) notFound();

  const project = client.projects as { id: string; name: string; logo_url: string | null };

  // Show ALL forms (draft + published) for the client
  const { data: forms } = await admin
    .from("forms_with_submission_count")
    .select("id, title, is_published, submission_count, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const formList = (forms ?? []) as {
    id: string; title: string; is_published: boolean; submission_count: number | null; created_at: string;
  }[];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {project.logo_url ? (
              <img src={project.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg,#9ea8ff,#7c87ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}>
                {project.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{project.name}</h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>
                Olá, {client.client_name}
              </p>
            </div>
          </div>

          {/* New form button */}
          <NewFormClientButton token={token} />
        </div>
      </div>

      {/* Forms */}
      {formList.length === 0 ? (
        <div style={{
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
          padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.35)",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>Nenhum formulário ainda.</p>
          <p style={{ margin: 0, fontSize: 13 }}>Crie o primeiro formulário usando o botão acima.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {formList.map(form => (
            <div key={form.id} style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              overflow: "hidden",
            }}>
              {/* Form row */}
              <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {form.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                      {form.submission_count ?? 0} resposta{(form.submission_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
                      background: form.is_published ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.07)",
                      color: form.is_published ? "#4ade80" : "rgba(255,255,255,0.35)",
                    }}>
                      {form.is_published ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Link href={`/c/${token}/forms/${form.id}/edit`}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                      background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
                      textDecoration: "none", border: "1px solid rgba(158,168,255,0.2)",
                    }}>
                    Editar
                  </Link>
                  <Link href={`/c/${token}/forms/${form.id}`}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                      background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                      textDecoration: "none", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    Respostas
                  </Link>
                  <Link href={`/c/${token}/forms/${form.id}/analytics`}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                      background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                      textDecoration: "none", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    Analytics
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
