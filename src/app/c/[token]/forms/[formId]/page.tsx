export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string; formId: string }>;
}

export const metadata: Metadata = { title: "Respostas" };

type Submission = {
  id: string;
  created_at: string;
  answers: Record<string, unknown> | null;
  metadata: Record<string, string> | null;
};

type Field = { id: string; label: string; type: string };

export default async function ClientFormPage({ params }: Props) {
  const { token, formId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Verify token and get project_id
  const { data: client } = await admin
    .from("project_clients")
    .select("project_id")
    .eq("token", token)
    .single();

  if (!client) notFound();

  // Verify form belongs to this project
  const { data: form } = await admin
    .from("forms")
    .select("id, title, fields, project_id")
    .eq("id", formId)
    .eq("project_id", client.project_id)
    .single();

  if (!form) notFound();

  const { data: submissions } = await admin
    .from("submissions")
    .select("id, created_at, answers, metadata")
    .eq("form_id", formId)
    .order("created_at", { ascending: false });

  const subs = (submissions ?? []) as Submission[];
  const fields = (form.fields ?? []) as Field[];
  const inputFields = fields.filter((f: Field) => f.type !== "statement");

  const s = {
    page: { maxWidth: 780, margin: "0 auto", padding: "48px 24px" },
    back: { fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 },
    header: { margin: "20px 0 32px" },
    title: { fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "rgba(255,255,255,0.9)" },
    tabs: { display: "flex", gap: 4, marginBottom: 24 },
    tab: (active: boolean) => ({
      fontSize: 13, fontWeight: active ? 600 : 500, padding: "6px 14px", borderRadius: 8,
      background: active ? "rgba(158,168,255,0.15)" : "transparent",
      color: active ? "#9ea8ff" : "rgba(255,255,255,0.4)",
      textDecoration: "none", border: "1px solid",
      borderColor: active ? "rgba(158,168,255,0.3)" : "transparent",
      transition: "all 0.15s",
    }),
    empty: {
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
      padding: "48px 24px", textAlign: "center" as const, color: "rgba(255,255,255,0.3)",
    },
  };

  return (
    <div style={s.page}>
      <Link href={`/c/${token}`} style={s.back}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Voltar
      </Link>

      <div style={s.header}>
        <h1 style={s.title}>{form.title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {subs.length} resposta{subs.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={s.tabs}>
        <span style={s.tab(true)}>Respostas</span>
        <Link href={`/c/${token}/forms/${formId}/analytics`} style={s.tab(false)}>Analytics</Link>
      </div>

      {subs.length === 0 ? (
        <div style={s.empty}><p style={{ margin: 0, fontSize: 14 }}>Nenhuma resposta ainda.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {subs.map(sub => (
            <div key={sub.id} style={{
              border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
              padding: "16px 20px", background: "rgba(255,255,255,0.02)",
            }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "0 0 12px" }}>
                {formatDate(sub.created_at)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inputFields.map((field: Field) => {
                  const val = sub.answers?.[field.id];
                  if (val == null || val === "") return null;
                  const display = Array.isArray(val) ? val.join(", ") : String(val);
                  return (
                    <div key={field.id}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {field.label}
                      </p>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: 0 }}>{display}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
