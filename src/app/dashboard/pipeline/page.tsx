import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isMqlByField } from "@/lib/score";
import type { Form, Submission } from "@/types/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pipeline MQL" };
export const dynamic = "force-dynamic";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dayKey(iso: string): string {
  return iso.slice(0, 10); // "2025-09-10"
}

function last30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ─── Gráfico SVG simples ────────────────────────────────────────────────────
function MqlChart({ data }: { data: { day: string; mqls: number; leads: number }[] }) {
  const W = 560;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => d.leads), 1);
  const xStep = innerW / (data.length - 1 || 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const leadsPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.leads)}`).join(" ");
  const mqlPath   = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.mqls)}`).join(" ");

  // Area fill para leads
  const leadsArea = `${leadsPath} L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`;

  // Tick labels: mostrar só a cada 5 dias
  const ticks = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.2)" fontSize="9">
              {Math.round(maxVal * t)}
            </text>
          </g>
        );
      })}

      {/* Leads area */}
      <path d={leadsArea} fill="rgba(125,131,189,0.08)" />
      {/* Leads line */}
      <path d={leadsPath} fill="none" stroke="rgba(125,131,189,0.4)" strokeWidth="1.5" />
      {/* MQL line */}
      <path d={mqlPath} fill="none" stroke="#7D83BD" strokeWidth="2" strokeDasharray="0" />

      {/* MQL dots */}
      {data.map((d, i) => d.mqls > 0 && (
        <circle key={i} cx={toX(i)} cy={toY(d.mqls)} r="2.5" fill="#7D83BD" />
      ))}

      {/* X axis ticks */}
      {ticks.map((d, _) => {
        const i = data.indexOf(d);
        return (
          <text key={d.day} x={toX(i)} y={H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.2)" fontSize="8">
            {fmtDay(d.day)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Todos os forms do usuário
  const { data: formsData } = await client
    .from("forms")
    .select("id, title, settings, fields")
    .eq("user_id", user.id) as { data: Form[] | null };

  const forms = formsData ?? [];

  // Todas as submissions dos últimos 30 dias (e um pouco mais pra segurança)
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const formIds = forms.map(f => f.id);

  let allSubs: (Submission & { status?: string })[] = [];
  if (formIds.length > 0) {
    const { data: subsData } = await client
      .from("submissions")
      .select("*")
      .in("form_id", formIds)
      .order("created_at", { ascending: false }) as { data: Submission[] | null };
    allSubs = subsData ?? [];
  }

  // Mapa form_id → form
  const formMap = new Map(forms.map(f => [f.id, f]));

  // ── Calcular MQLs por campo de qualificação ──────────────────────────────
  const subsWithMeta = allSubs.map(sub => {
    const form = formMap.get(sub.form_id);
    const fields = (form?.fields ?? []) as import("@/types/database.types").FormField[];
    const mqlField = fields.find(f => f.isMqlField);
    const mql = isMqlByField(sub.answers, fields);
    const mqlFieldValue = mqlField ? sub.answers[mqlField.id] : undefined;
    return { ...sub, mql, mqlFieldValue, formTitle: form?.title ?? "—" };
  });

  // ── Stats gerais ──────────────────────────────────────────────────────────
  const totalLeads = subsWithMeta.length;
  const totalMqls  = subsWithMeta.filter(s => s.mql).length;
  const mqlRate    = totalLeads > 0 ? Math.round((totalMqls / totalLeads) * 100) : 0;

  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  const mqls7d = subsWithMeta.filter(s => s.mql && new Date(s.created_at) >= last7).length;

  // ── Dados por dia (últimos 30 dias) ───────────────────────────────────────
  const days = last30Days();
  const dayData = days.map(day => ({
    day,
    leads: subsWithMeta.filter(s => dayKey(s.created_at) === day).length,
    mqls:  subsWithMeta.filter(s => s.mql && dayKey(s.created_at) === day).length,
  }));

  // ── MQLs por form ─────────────────────────────────────────────────────────
  const byForm = forms.map(form => {
    const formSubs = subsWithMeta.filter(s => s.form_id === form.id);
    const mqls = formSubs.filter(s => s.mql).length;
    const hasConfig = (form.fields as import("@/types/database.types").FormField[]).some(f => f.isMqlField);
    return { form, total: formSubs.length, mqls, hasConfig };
  }).filter(f => f.total > 0).sort((a, b) => b.mqls - a.mqls);

  // ── MQLs recentes ─────────────────────────────────────────────────────────
  const recentMqls = subsWithMeta.filter(s => s.mql).slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Pipeline MQL</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Leads qualificados em todos os formulários
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de leads",   value: totalLeads, sub: "todos os forms" },
          { label: "MQLs totais",      value: totalMqls,  sub: "leads qualificados", accent: true },
          { label: "Taxa de MQL",      value: `${mqlRate}%`, sub: "leads → MQL" },
          { label: "MQLs (7 dias)",    value: mqls7d,     sub: "última semana" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label}
            className="rounded-xl p-4 text-center"
            style={{
              background: accent ? "rgba(125,131,189,0.10)" : "var(--card-bg)",
              border: accent ? "1px solid rgba(125,131,189,0.25)" : "1px solid var(--card-border)",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: accent ? "#CBCDE5" : "rgba(255,255,255,0.88)" }}>
              {value}
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Leads × MQLs — últimos 30 dias</p>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: "20px", height: "2px", background: "rgba(125,131,189,0.4)" }} />
              Leads
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: "20px", height: "2px", background: "#7D83BD" }} />
              MQLs
            </span>
          </div>
        </div>
        {totalLeads === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
            Sem dados ainda
          </div>
        ) : (
          <MqlChart data={dayData} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* MQLs por formulário */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-sm font-semibold">MQLs por formulário</p>
          {byForm.length === 0 && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Nenhum formulário com respostas.</p>
          )}
          {byForm.map(({ form, total, mqls, hasConfig }) => {
            const pct = total > 0 ? Math.round((mqls / total) * 100) : 0;
            return (
              <div key={form.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/forms/${form.id}/kanban`}
                    className="text-xs font-medium truncate hover:underline"
                    style={{ color: "rgba(255,255,255,0.75)", maxWidth: "60%" }}>
                    {form.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    {!hasConfig && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                        sem config
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: "#7D83BD" }}>{mqls}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>/ {total}</span>
                  </div>
                </div>
                <div style={{ height: "3px", borderRadius: "8px", background: "rgba(255,255,255,0.06)" }}>
                  <div style={{
                    height: "3px", borderRadius: "8px",
                    width: `${pct}%`,
                    background: mqls > 0 ? "#7D83BD" : "rgba(255,255,255,0.1)",
                    transition: "width 0.4s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* MQLs recentes */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-sm font-semibold">MQLs recentes</p>
          {recentMqls.length === 0 && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Nenhum MQL ainda. Configure threshold nos formulários.
            </p>
          )}
          {recentMqls.map((sub) => {
            const form = formMap.get(sub.form_id);
            const fields = form?.fields ?? [];
            // Nome do lead
            const nameField = fields.find((f: { type: string; label: string }) =>
              f.type !== "statement" && /nome|name/i.test(f.label)
            );
            const name = nameField ? String(sub.answers[nameField.id] ?? "—") : "Lead";

            return (
              <div key={sub.id} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{name}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {sub.formTitle} · {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {sub.mqlFieldValue != null && (
                  <span style={{
                    fontSize: "11px", fontWeight: 700,
                    color: "#4ade80",
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    borderRadius: "8px",
                    padding: "2px 8px",
                  }}>
                    ✓ MQL
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Call to action se nenhum form tem campo MQL configurado */}
      {forms.length > 0 && forms.every(f => !(f.fields as import("@/types/database.types").FormField[]).some(field => field.isMqlField)) && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
          style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", color: "#fbbf24" }}>
          <span>⚠</span>
          <span>
            Nenhum formulário tem campo de qualificação configurado.{" "}
            Vá no editor de cada form → Configurações → <strong>Qualificação MQL</strong> e ative o campo desejado.
          </span>
        </div>
      )}
    </div>
  );
}
