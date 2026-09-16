export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string; formId: string }>;
}

export const metadata: Metadata = { title: "Analytics" };

type Field = { id: string; label: string; type: string; options?: { label: string }[] };
type FormEvent = { event_type: string; question_index?: number | null };
type Submission = { id: string; answers: Record<string, unknown> | null };

export default async function ClientFormAnalyticsPage({ params }: Props) {
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

  const [{ data: events }, { data: submissions }] = await Promise.all([
    admin.from("form_events").select("event_type, question_index").eq("form_id", formId),
    admin.from("submissions").select("id, answers").eq("form_id", formId),
  ]);

  const evs = (events ?? []) as FormEvent[];
  const subs = (submissions ?? []) as Submission[];
  const fields = (form.fields ?? []) as Field[];
  const inputFields = fields.filter((f: Field) => f.type !== "statement");

  const views = evs.filter(e => e.event_type === "view").length;
  const starts = evs.filter(e => e.event_type === "start").length;
  const completes = evs.filter(e => e.event_type === "complete").length;
  const startRate = views > 0 ? Math.round((starts / views) * 100) : 0;
  const completionRate = starts > 0 ? Math.round((completes / starts) * 100) : 0;

  const s = {
    page: { maxWidth: 780, margin: "0 auto", padding: "48px 24px" },
    back: { fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 },
    title: { fontSize: 22, fontWeight: 700, margin: "20px 0 4px", color: "rgba(255,255,255,0.9)" },
    tabs: { display: "flex", gap: 4, margin: "0 0 24px" },
    tab: (active: boolean) => ({
      fontSize: 13, fontWeight: active ? 600 : 500, padding: "6px 14px", borderRadius: 8,
      background: active ? "rgba(158,168,255,0.15)" : "transparent",
      color: active ? "#9ea8ff" : "rgba(255,255,255,0.4)",
      textDecoration: "none", border: "1px solid",
      borderColor: active ? "rgba(158,168,255,0.3)" : "transparent",
    }),
    card: {
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
      padding: "16px 20px", background: "rgba(255,255,255,0.02)",
    },
    label: { fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 4px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
    stat: (color: string) => ({ fontSize: 32, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" as const, margin: 0 }),
  };

  // Choice field distributions
  const choiceFields = inputFields.filter((f: Field) =>
    f.type === "multiple_choice" || f.type === "yes_no" || f.type === "rating"
  );

  return (
    <div style={s.page}>
      <Link href={`/c/${token}/forms/${formId}/edit`} style={s.back}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Voltar
      </Link>

      <h1 style={s.title}>{form.title}</h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Analytics de conversão</p>

      <div style={s.tabs}>
        <Link href={`/c/${token}/forms/${formId}`} style={s.tab(false)}>Respostas</Link>
        <span style={s.tab(true)}>Analytics</span>
      </div>

      {/* Funnel stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Visualizações", value: views, color: "#60a5fa" },
          { label: "Iniciaram", value: starts, sub: `${startRate}% dos views`, color: "#818cf8" },
          { label: "Concluíram", value: completes, sub: `${completionRate}% dos inícios`, color: "#34d399" },
          { label: "Respostas", value: subs.length, color: "#a78bfa" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={s.card}>
            <p style={s.label}>{label}</p>
            <p style={s.stat(color)}>{value}</p>
            {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Funnel bar */}
      {views > 0 && (
        <div style={{ ...s.card, marginBottom: 20 }}>
          <p style={{ ...s.label, marginBottom: 12 }}>Funil de conversão</p>
          {[
            { label: "Views", count: views, color: "#60a5fa" },
            { label: "Inícios", count: starts, color: "#818cf8" },
            { label: "Conclusões", count: completes, color: "#34d399" },
          ].map(({ label, count, color }) => {
            const pct = views > 0 ? Math.round((count / views) * 100) : 0;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", width: 72, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", width: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Choice distributions */}
      {choiceFields.map((field: Field) => {
        const counts: Record<string, number> = {};
        for (const sub of subs) {
          const raw = sub.answers?.[field.id];
          if (raw == null) continue;
          const vals = Array.isArray(raw) ? raw as string[] : [String(raw)];
          for (const v of vals) if (v) counts[v] = (counts[v] ?? 0) + 1;
        }
        const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (items.length === 0) return null;
        const max = items[0][1];
        return (
          <div key={field.id} style={{ ...s.card, marginBottom: 12 }}>
            <p style={{ ...s.label, marginBottom: 12 }}>{field.label}</p>
            {items.map(([label, count]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", minWidth: 80, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((count / max) * 100)}%`, height: "100%", background: "#818cf8", borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{count}</span>
              </div>
            ))}
          </div>
        );
      })}

      {views === 0 && subs.length === 0 && (
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
          <p style={{ margin: 0, fontSize: 14 }}>Sem dados ainda.</p>
        </div>
      )}
    </div>
  );
}
