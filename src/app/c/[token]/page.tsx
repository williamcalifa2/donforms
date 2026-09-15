export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

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

  const { data: forms } = await admin
    .from("forms_with_submission_count")
    .select("id, title, is_published, submission_count")
    .eq("project_id", project.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const formList = (forms ?? []) as { id: string; title: string; is_published: boolean; submission_count: number | null }[];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
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
      </div>

      {/* Forms */}
      {formList.length === 0 ? (
        <div style={{
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
          padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.35)",
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>Nenhum formulário disponível ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {formList.map(form => (
            <Link key={form.id} href={`/c/${token}/forms/${form.id}`}
              style={{
                display: "block", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "16px 20px",
                background: "rgba(255,255,255,0.025)",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(158,168,255,0.35)";
                (e.currentTarget as HTMLElement).style.background = "rgba(158,168,255,0.05)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                  {form.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {form.submission_count ?? 0} resposta{(form.submission_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
