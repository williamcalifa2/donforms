import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Form } from "@/types/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

interface FormEvent {
  id: string;
  form_id: string;
  event_type: "view" | "start" | "abandon" | "complete";
  question_index: number | null;
  session_id: string | null;
  created_at: string;
}

// Tempo médio de preenchimento: match start↔complete por session_id
function avgCompletionSeconds(events: FormEvent[]): number | null {
  const starts: Record<string, string> = {};
  const completes: Record<string, string> = {};
  for (const e of events) {
    if (!e.session_id) continue;
    if (e.event_type === "start") starts[e.session_id] = e.created_at;
    if (e.event_type === "complete") completes[e.session_id] = e.created_at;
  }
  const durations: number[] = [];
  for (const [sid, endTs] of Object.entries(completes)) {
    const startTs = starts[sid];
    if (!startTs) continue;
    const diff = (new Date(endTs).getTime() - new Date(startTs).getTime()) / 1000;
    if (diff > 0 && diff < 3600) durations.push(diff); // ignora >1h (outliers)
  }
  if (durations.length === 0) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// SVG sparkline simples
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 80, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  }).join(" ");
  const area = `${pts} ${W},${H} 0,${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polygon points={area} fill={`${color}20`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: formsData } = await client
    .from("forms")
    .select("id, title, slug, is_published, fields, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as { data: Form[] | null };

  const forms = formsData ?? [];
  const formIds = forms.map(f => f.id);

  let allEvents: FormEvent[] = [];
  if (formIds.length > 0) {
    const { data } = await client
      .from("form_events")
      .select("id, form_id, event_type, question_index, session_id, created_at")
      .in("form_id", formIds)
      .order("created_at", { ascending: true }) as { data: FormEvent[] | null };
    allEvents = data ?? [];
  }

  // ── Global stats ──────────────────────────────────────────────────────────
  const totalViews     = allEvents.filter(e => e.event_type === "view").length;
  const totalStarts    = allEvents.filter(e => e.event_type === "start").length;
  const totalCompletes = allEvents.filter(e => e.event_type === "complete").length;
  const totalAbandons  = allEvents.filter(e => e.event_type === "abandon").length;
  const globalConversion = totalViews > 0 ? Math.round((totalCompletes / totalViews) * 100) : 0;
  const globalAvgTime = avgCompletionSeconds(allEvents);

  // ── Last 14 days activity ─────────────────────────────────────────────────
  const days14: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days14.push(d.toISOString().slice(0, 10));
  }
  const activityData = days14.map(day => ({
    day,
    views:     allEvents.filter(e => e.created_at.slice(0,10) === day && e.event_type === "view").length,
    completes: allEvents.filter(e => e.created_at.slice(0,10) === day && e.event_type === "complete").length,
  }));

  // ── Per-form stats ─────────────────────────────────────────────────────────
  const formStats = forms.map(form => {
    const evs = allEvents.filter(e => e.form_id === form.id);
    const views     = evs.filter(e => e.event_type === "view").length;
    const starts    = evs.filter(e => e.event_type === "start").length;
    const completes = evs.filter(e => e.event_type === "complete").length;
    const abandons  = evs.filter(e => e.event_type === "abandon").length;
    const conversion = views > 0 ? Math.round((completes / views) * 100) : 0;
    const startRate  = views > 0 ? Math.round((starts / views) * 100) : 0;
    const avgTime    = avgCompletionSeconds(evs);

    // Sparkline: completes por dia (últimos 14 dias)
    const spark = days14.map(day =>
      evs.filter(e => e.created_at.slice(0,10) === day && e.event_type === "complete").length
    );

    // Drop-off: qual pergunta tem mais abandono
    const inputFields = form.fields.filter(f => f.type !== "statement");
    const worstDropIdx = abandons > 0
      ? (() => {
          const counts = inputFields.map((_, i) => evs.filter(e => e.event_type === "abandon" && e.question_index === i).length);
          const max = Math.max(...counts);
          return max > 0 ? counts.indexOf(max) : null;
        })()
      : null;
    const worstDropField = worstDropIdx !== null ? inputFields[worstDropIdx] : null;

    return { form, views, starts, completes, abandons, conversion, startRate, avgTime, spark, worstDropField };
  }).sort((a, b) => b.views - a.views);

  // SVG bar chart for activity
  const maxActivity = Math.max(...activityData.map(d => d.views), 1);
  const chartW = 560, chartH = 100, padL = 0, padB = 20;
  const innerW = chartW - padL;
  const innerH = chartH - padB;
  const barW = innerW / days14.length - 2;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão unificada de todos os formulários</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Views",       value: totalViews,                   accent: false },
          { label: "Iniciaram",   value: totalStarts,                  accent: false },
          { label: "Concluíram",  value: totalCompletes,               accent: true  },
          { label: "Abandonaram", value: totalAbandons,                accent: false },
          { label: "Conversão",   value: `${globalConversion}%`,       accent: true  },
          { label: "Tempo médio", value: globalAvgTime ? fmtTime(globalAvgTime) : "—", accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label}
            className="rounded-xl p-4 text-center"
            style={{
              background: accent ? "rgba(125,131,189,0.10)" : "var(--card-bg)",
              border: accent ? "1px solid rgba(125,131,189,0.25)" : "1px solid var(--card-border)",
            }}
          >
            <p className="text-2xl font-bold tabular-nums"
              style={{ color: accent ? "#CBCDE5" : "rgba(255,255,255,0.88)" }}>
              {value}
            </p>
            <p className="text-[10px] font-medium mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Activity chart — 14 days */}
      <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Atividade — últimos 14 dias</p>
          <div className="flex gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 12, height: 2, background: "rgba(125,131,189,0.5)", borderRadius: 1 }} />
              Views
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 12, height: 2, background: "#4ade80", borderRadius: 1 }} />
              Conclusões
            </span>
          </div>
        </div>
        {totalViews === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
            Sem dados ainda
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", minWidth: 320, height: "auto" }}>
              {/* Grid */}
              {[0.25, 0.5, 0.75, 1].map(t => (
                <line key={t}
                  x1={padL} y1={innerH * (1 - t)}
                  x2={chartW} y2={innerH * (1 - t)}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              {/* Bars — views */}
              {activityData.map((d, i) => {
                const x = padL + i * (innerW / days14.length) + 1;
                const h = (d.views / maxActivity) * innerH;
                return (
                  <rect key={`v${i}`}
                    x={x} y={innerH - h} width={barW} height={h}
                    fill="rgba(125,131,189,0.25)" rx="2" />
                );
              })}
              {/* Bars — completes */}
              {activityData.map((d, i) => {
                const x = padL + i * (innerW / days14.length) + 1;
                const h = (d.completes / maxActivity) * innerH;
                return (
                  <rect key={`c${i}`}
                    x={x} y={innerH - h} width={barW} height={h}
                    fill="rgba(74,222,128,0.55)" rx="2" />
                );
              })}
              {/* X labels */}
              {activityData.filter((_, i) => i % 2 === 0).map((d, i) => {
                const realI = i * 2;
                const x = padL + realI * (innerW / days14.length) + barW / 2;
                return (
                  <text key={d.day} x={x} y={chartH - 4}
                    textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">
                    {fmtDate(d.day)}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Per-form table */}
      <div>
        <p className="text-sm font-semibold mb-3">Por formulário</p>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--card-border)" }}>
          {/* Table head */}
          <div className="grid text-[10px] font-semibold uppercase tracking-wider px-5 py-3"
            style={{
              gridTemplateColumns: "2fr 60px 60px 60px 80px 80px 80px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid var(--card-border)",
              color: "rgba(255,255,255,0.3)",
              gap: "0 12px",
            }}>
            <span>Formulário</span>
            <span className="text-right">Views</span>
            <span className="text-right">Início</span>
            <span className="text-right">Conclusão</span>
            <span className="text-right">Conversão</span>
            <span className="text-right">Tempo médio</span>
            <span className="text-right">14 dias</span>
          </div>

          {formStats.length === 0 && (
            <div className="px-5 py-8 text-sm text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              Nenhum formulário ainda
            </div>
          )}

          {formStats.map(({ form, views, completes, conversion, startRate, avgTime, spark }, idx) => {
            const isGood = conversion >= 50;
            const isMid  = conversion >= 20 && conversion < 50;
            const convColor = views === 0 ? "rgba(255,255,255,0.25)"
              : isGood ? "#4ade80" : isMid ? "#fbbf24" : "#f87171";

            return (
              <div key={form.id}
                className="grid items-center px-5 py-4 transition-colors hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns: "2fr 60px 60px 60px 80px 80px 80px",
                  borderBottom: idx < formStats.length - 1 ? "1px solid var(--card-border)" : "none",
                  gap: "0 12px",
                }}>
                {/* Name + status */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: form.is_published ? "#4ade80" : "rgba(255,255,255,0.2)",
                    boxShadow: form.is_published ? "0 0 5px #4ade8077" : "none",
                  }} />
                  <div className="min-w-0">
                    <Link href={`/dashboard/forms/${form.id}/analytics`}
                      className="text-sm font-medium truncate block hover:text-primary transition-colors"
                      style={{ color: "rgba(255,255,255,0.82)" }}>
                      {form.title}
                    </Link>
                    {views === 0 && (
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>sem dados</span>
                    )}
                  </div>
                </div>

                <span className="text-sm tabular-nums text-right" style={{ color: "rgba(255,255,255,0.55)" }}>{views}</span>
                <span className="text-sm tabular-nums text-right" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {views > 0 ? `${startRate}%` : "—"}
                </span>
                <span className="text-sm tabular-nums text-right" style={{ color: "rgba(255,255,255,0.55)" }}>{completes}</span>
                <span className="text-sm tabular-nums font-semibold text-right" style={{ color: convColor }}>
                  {views > 0 ? `${conversion}%` : "—"}
                </span>
                <span className="text-sm tabular-nums text-right" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {avgTime ? fmtTime(avgTime) : "—"}
                </span>

                {/* Sparkline */}
                <div className="flex justify-end">
                  {spark.some(v => v > 0)
                    ? <Sparkline data={spark} color="#7D83BD" />
                    : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>—</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        <span>Conversão: <span style={{ color: "#4ade80" }}>≥50% ótima</span> · <span style={{ color: "#fbbf24" }}>≥20% ok</span> · <span style={{ color: "#f87171" }}>&lt;20% baixa</span></span>
      </div>
    </div>
  );
}
