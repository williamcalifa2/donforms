export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { NewFormClientButton } from "./NewFormClientButton";
import { ClientPortalForms } from "./ClientPortalForms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://donforms.dondigital.com.br";

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
    .select("id, title, slug, is_published, submission_count, updated_at, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const formList = (forms ?? []) as {
    id: string; title: string; slug: string; is_published: boolean;
    submission_count: number | null; updated_at: string; created_at: string;
  }[];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
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
      <ClientPortalForms token={token} forms={formList} appUrl={APP_URL} />
    </div>
  );
}
