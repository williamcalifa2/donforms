export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientPortalResponseCards } from "./ClientPortalResponseCards";
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

  const { data: client } = await admin
    .from("project_clients")
    .select("project_id")
    .eq("token", token)
    .single();

  if (!client) notFound();

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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = Date.now();
  const last7d = subs.filter(s => now - new Date(s.created_at).getTime() < 7 * 86400000).length;
  const lastResponse = subs[0]?.created_at ?? null;

  function relativeDate(iso: string): string {
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d atrás`;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  const stats = [
    { label: "Total de respostas", value: subs.length, sub: subs.length === 0 ? "Nenhuma ainda" : `${subs.length} submissão${subs.length !== 1 ? "ões" : ""}` },
    { label: "Últimos 7 dias", value: last7d, sub: last7d === 0 ? "Nenhuma este período" : `+${last7d} esta semana` },
    { label: "Última resposta", value: lastResponse ? relativeDate(lastResponse) : "—", sub: lastResponse ? new Date(lastResponse).toLocaleDateString("pt-BR") : "Aguardando" },
  ];

  const tabStyle = (active: boolean) => ({
    fontSize: 13, fontWeight: active ? 600 : 500, padding: "6px 14px", borderRadius: 8,
    background: active ? "rgba(158,168,255,0.15)" : "transparent",
    color: active ? "#9ea8ff" : "rgba(255,255,255,0.4)",
    textDecoration: "none", border: "1px solid",
    borderColor: active ? "rgba(158,168,255,0.3)" : "transparent",
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <Link href={`/c/${token}/forms/${formId}/edit`}
        style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Voltar
      </Link>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ margin: "20px 0 28px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "rgba(255,255,255,0.9)" }}>{form.title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {subs.length} resposta{subs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", background: "rgba(255,255,255,0.02)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.3)", margin: "0 0 8px" }}>{stat.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: "0 0 4px", lineHeight: 1 }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <span style={tabStyle(true)}>Respostas</span>
        <Link href={`/c/${token}/forms/${formId}/analytics`} style={tabStyle(false)}>Analytics</Link>
      </div>

      {/* ── Client cards ─────────────────────────────────────────────────── */}
      <ClientPortalResponseCards
        submissions={subs}
        fields={fields.filter(f => f.type !== "statement")}
        formTitle={form.title}
      />
    </div>
  );
}
