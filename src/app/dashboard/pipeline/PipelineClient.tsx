"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { FormField } from "@/types/database.types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubRow {
  id: string;
  form_id: string;
  answers: Record<string, string | string[] | number>;
  metadata: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string };
  created_at: string;
  mql: boolean;
  mqlFieldValue: unknown;
  formTitle: string;
  leadName: string;
}

export interface FormRow {
  id: string;
  title: string;
  hasConfig: boolean;
}

interface Props {
  subs: SubRow[];
  forms: FormRow[];
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function dayKey(iso: string) { return iso.slice(0, 10); }
function fmtDay(iso: string) { const [, m, d] = iso.split("-"); return `${d}/${m}`; }

function buildDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function MqlChart({ data }: { data: { day: string; mqls: number; leads: number }[] }) {
  const W = 560; const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.leads), 1);
  const xStep = innerW / (data.length - 1 || 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;
  const leadsPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.leads)}`).join(" ");
  const mqlPath   = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.mqls)}`).join(" ");
  const leadsArea = `${leadsPath} L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`;
  const ticks = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{Math.round(maxVal * t)}</text>
          </g>
        );
      })}
      <path d={leadsArea} fill="rgba(158,168,255,0.06)" />
      <path d={leadsPath} fill="none" stroke="rgba(158,168,255,0.35)" strokeWidth="1.5" />
      <path d={mqlPath} fill="none" stroke="hsl(233 100% 81%)" strokeWidth="2" />
      {data.map((d, i) => d.mqls > 0 && (
        <circle key={i} cx={toX(i)} cy={toY(d.mqls)} r="2.5" fill="hsl(233 100% 81%)" />
      ))}
      {ticks.map(d => {
        const i = data.indexOf(d);
        return (
          <text key={d.day} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">{fmtDay(d.day)}</text>
        );
      })}
    </svg>
  );
}

// ── Filter helpers ─────────────────────────────────────────────────────────────

type DateRange = "7d" | "30d" | "90d" | "all";
type MqlFilter = "all" | "mql" | "non_mql";

function Select({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 8,
          color: value !== "" && value !== "all" ? "var(--accent-c)" : "var(--text-secondary)",
          fontSize: 12,
          fontWeight: 500,
          padding: "5px 28px 5px 10px",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
          minWidth: 120,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineClient({ subs, forms }: Props) {
  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [mqlFilter, setMqlFilter] = useState<MqlFilter>("all");
  const [utmSource, setUtmSource] = useState<string>("");
  const [utmMedium, setUtmMedium] = useState<string>("");
  const [utmCampaign, setUtmCampaign] = useState<string>("");

  // Unique UTM values from all data
  const utmOptions = useMemo(() => {
    const sources   = new Set<string>();
    const mediums   = new Set<string>();
    const campaigns = new Set<string>();
    for (const s of subs) {
      if (s.metadata?.utm_source)   sources.add(s.metadata.utm_source);
      if (s.metadata?.utm_medium)   mediums.add(s.metadata.utm_medium);
      if (s.metadata?.utm_campaign) campaigns.add(s.metadata.utm_campaign);
    }
    return { sources: [...sources].sort(), mediums: [...mediums].sort(), campaigns: [...campaigns].sort() };
  }, [subs]);

  // Date cutoff
  const cutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const d = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d;
  }, [dateRange]);

  // Filtered subs
  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (cutoff && new Date(s.created_at) < cutoff) return false;
      if (formFilter !== "all" && s.form_id !== formFilter) return false;
      if (mqlFilter === "mql" && !s.mql) return false;
      if (mqlFilter === "non_mql" && s.mql) return false;
      if (utmSource   && s.metadata?.utm_source   !== utmSource)   return false;
      if (utmMedium   && s.metadata?.utm_medium   !== utmMedium)   return false;
      if (utmCampaign && s.metadata?.utm_campaign !== utmCampaign) return false;
      return true;
    });
  }, [subs, cutoff, formFilter, mqlFilter, utmSource, utmMedium, utmCampaign]);

  // Active filter count
  const activeFilters = [
    dateRange !== "30d",
    formFilter !== "all",
    mqlFilter !== "all",
    !!utmSource,
    !!utmMedium,
    !!utmCampaign,
  ].filter(Boolean).length;

  const clearAll = () => {
    setDateRange("30d");
    setFormFilter("all");
    setMqlFilter("all");
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
  };

  // KPIs
  const totalLeads = filtered.length;
  const totalMqls  = filtered.filter(s => s.mql).length;
  const mqlRate    = totalLeads > 0 ? Math.round((totalMqls / totalLeads) * 100) : 0;
  const last7Cutoff = new Date(); last7Cutoff.setDate(last7Cutoff.getDate() - 7);
  const mqls7d = filtered.filter(s => s.mql && new Date(s.created_at) >= last7Cutoff).length;

  // Chart days (based on date range)
  const chartDays = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
  const days = useMemo(() => buildDays(chartDays), [chartDays]);
  const dayData = useMemo(() => days.map(day => ({
    day,
    leads: filtered.filter(s => dayKey(s.created_at) === day).length,
    mqls:  filtered.filter(s => s.mql && dayKey(s.created_at) === day).length,
  })), [filtered, days]);

  // By form
  const byForm = useMemo(() => {
    return forms.map(form => {
      const formSubs = filtered.filter(s => s.form_id === form.id);
      const mqls = formSubs.filter(s => s.mql).length;
      return { form, total: formSubs.length, mqls };
    }).filter(f => f.total > 0).sort((a, b) => b.mqls - a.mqls);
  }, [filtered, forms]);

  // UTM breakdown
  const utmBreakdown = useMemo(() => {
    const map: Record<string, { leads: number; mqls: number }> = {};
    for (const s of filtered) {
      const src = s.metadata?.utm_source || "(direto)";
      if (!map[src]) map[src] = { leads: 0, mqls: 0 };
      map[src].leads++;
      if (s.mql) map[src].mqls++;
    }
    return Object.entries(map)
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.mqls - a.mqls);
  }, [filtered]);

  // Recent MQLs
  const recentMqls = filtered.filter(s => s.mql).slice(0, 10);

  // No UTM data at all?
  const hasAnyUtm = subs.some(s => s.metadata?.utm_source || s.metadata?.utm_medium || s.metadata?.utm_campaign);

  const cardStyle = { background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12 };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pipeline MQL</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leads qualificados em todos os formulários
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ ...cardStyle, padding: "14px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Select
            label="Período"
            value={dateRange}
            onChange={v => setDateRange(v as DateRange)}
            options={[
              { value: "7d",  label: "Últimos 7 dias" },
              { value: "30d", label: "Últimos 30 dias" },
              { value: "90d", label: "Últimos 90 dias" },
              { value: "all", label: "Todo período" },
            ]}
          />
          <Select
            label="Formulário"
            value={formFilter}
            onChange={setFormFilter}
            options={[
              { value: "all", label: "Todos os forms" },
              ...forms.map(f => ({ value: f.id, label: f.title })),
            ]}
          />
          <Select
            label="Status"
            value={mqlFilter}
            onChange={v => setMqlFilter(v as MqlFilter)}
            options={[
              { value: "all",     label: "Todos" },
              { value: "mql",     label: "Apenas MQLs" },
              { value: "non_mql", label: "Não MQL" },
            ]}
          />

          {/* UTM filters — only show if there's UTM data */}
          {hasAnyUtm && (
            <>
              <Select
                label="UTM Source"
                value={utmSource}
                onChange={setUtmSource}
                options={[
                  { value: "", label: "Todas as fontes" },
                  ...utmOptions.sources.map(s => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="UTM Medium"
                value={utmMedium}
                onChange={setUtmMedium}
                options={[
                  { value: "", label: "Todos os meios" },
                  ...utmOptions.mediums.map(m => ({ value: m, label: m })),
                ]}
              />
              {utmOptions.campaigns.length > 0 && (
                <Select
                  label="Campanha"
                  value={utmCampaign}
                  onChange={setUtmCampaign}
                  options={[
                    { value: "", label: "Todas as campanhas" },
                    ...utmOptions.campaigns.map(c => ({ value: c, label: c })),
                  ]}
                />
              )}
            </>
          )}

          {/* Clear button */}
          {activeFilters > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 10, color: "transparent" }}>clear</label>
              <button
                onClick={clearAll}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 8,
                  background: "hsl(233 100% 81% / .1)",
                  border: "1px solid hsl(233 100% 81% / .25)",
                  color: "var(--accent-c)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: "50%",
                  background: "var(--accent-c)", color: "hsl(230 35% 7%)",
                  fontSize: 9, fontWeight: 700,
                }}>{activeFilters}</span>
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Active filter pills */}
        {activeFilters > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {dateRange !== "30d" && <FilterPill label={`Período: ${dateRange === "all" ? "Todo" : dateRange}`} onRemove={() => setDateRange("30d")} />}
            {formFilter !== "all" && <FilterPill label={`Form: ${forms.find(f => f.id === formFilter)?.title ?? formFilter}`} onRemove={() => setFormFilter("all")} />}
            {mqlFilter !== "all" && <FilterPill label={mqlFilter === "mql" ? "Apenas MQLs" : "Não MQL"} onRemove={() => setMqlFilter("all")} />}
            {utmSource   && <FilterPill label={`Source: ${utmSource}`}     onRemove={() => setUtmSource("")} />}
            {utmMedium   && <FilterPill label={`Medium: ${utmMedium}`}     onRemove={() => setUtmMedium("")} />}
            {utmCampaign && <FilterPill label={`Campanha: ${utmCampaign}`} onRemove={() => setUtmCampaign("")} />}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de leads",   value: totalLeads, sub: "no período filtrado" },
          { label: "MQLs totais",      value: totalMqls,  sub: "leads qualificados", accent: true },
          { label: "Taxa de MQL",      value: `${mqlRate}%`, sub: "conversão leads → MQL" },
          { label: "MQLs (7 dias)",    value: mqls7d,     sub: "última semana" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label}
            className="rounded-xl p-4 text-center"
            style={{
              background: accent ? "hsl(233 100% 81% / .08)" : "var(--card-bg)",
              border: accent ? "1px solid hsl(233 100% 81% / .2)" : "1px solid var(--card-border)",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: accent ? "var(--accent-c)" : "var(--text-primary)" }}>
              {value}
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ ...cardStyle, padding: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Leads × MQLs</p>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 20, height: 2, background: "rgba(158,168,255,0.35)" }} />
              Leads
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 20, height: 2, background: "hsl(233 100% 81%)" }} />
              MQLs
            </span>
          </div>
        </div>
        {totalLeads === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Sem dados para o filtro selecionado
          </div>
        ) : (
          <MqlChart data={dayData} />
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* MQLs por formulário */}
        <div style={{ ...cardStyle, padding: 20 }} className="space-y-3">
          <p className="text-sm font-semibold">MQLs por formulário</p>
          {byForm.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Nenhum resultado.</p>
          )}
          {byForm.map(({ form, total, mqls }) => {
            const pct = total > 0 ? Math.round((mqls / total) * 100) : 0;
            return (
              <div key={form.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/forms/${form.id}/kanban`}
                    className="text-xs font-medium truncate hover:underline"
                    style={{ color: "var(--text-secondary)", maxWidth: "60%" }}>
                    {form.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    {!form.hasConfig && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                        sem config
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: "var(--accent-c)" }}>{mqls}</span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>/ {total}</span>
                  </div>
                </div>
                <div style={{ height: 3, borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{
                    height: 3, borderRadius: 8, width: `${pct}%`,
                    background: mqls > 0 ? "var(--accent-c)" : "rgba(255,255,255,0.1)",
                    transition: "width 0.4s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* UTM breakdown OR recent MQLs */}
        {hasAnyUtm ? (
          <div style={{ ...cardStyle, padding: 20 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">MQLs por origem</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-soft)", color: "var(--accent-c)", fontWeight: 600 }}>
                UTM Source
              </span>
            </div>
            {utmBreakdown.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sem dados.</p>
            ) : (
              utmBreakdown.map(({ source, leads, mqls }) => {
                const pct = leads > 0 ? Math.round((mqls / leads) * 100) : 0;
                const maxLeads = Math.max(...utmBreakdown.map(u => u.leads), 1);
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: source === "(direto)" ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                        {source}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{ color: "var(--accent-c)" }}>{mqls} MQL</span>
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{pct}%</span>
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>/ {leads}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{
                        height: 3, borderRadius: 8,
                        width: `${Math.round((leads / maxLeads) * 100)}%`,
                        background: source === "(direto)" ? "rgba(255,255,255,0.15)" : "var(--accent-c)",
                        opacity: source === "(direto)" ? 0.5 : 1,
                        transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 20 }} className="space-y-3">
            <p className="text-sm font-semibold">MQLs recentes</p>
            {recentMqls.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Nenhum MQL ainda. Configure threshold nos formulários.
              </p>
            )}
            {recentMqls.map(sub => (
              <div key={sub.id} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{sub.leadName}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {sub.formTitle} · {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#4ade80",
                  background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 8, padding: "2px 8px",
                }}>✓ MQL</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MQLs recentes (quando há UTM, mostrar abaixo em full width) */}
      {hasAnyUtm && recentMqls.length > 0 && (
        <div style={{ ...cardStyle, padding: 20 }} className="space-y-3">
          <p className="text-sm font-semibold">MQLs recentes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
            {recentMqls.map(sub => (
              <div key={sub.id} className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid var(--card-border)" }}>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{sub.leadName}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>
                    {sub.formTitle} · {sub.metadata?.utm_source ? `📍 ${sub.metadata.utm_source}` : "direto"} · {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#4ade80",
                  background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 8, padding: "2px 8px", marginLeft: 8,
                }}>✓ MQL</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 10px", borderRadius: 20,
      background: "hsl(233 100% 81% / .1)",
      border: "1px solid hsl(233 100% 81% / .2)",
      fontSize: 11, fontWeight: 500, color: "var(--accent-c)",
    }}>
      {label}
      <button onClick={onRemove} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, borderRadius: "50%",
        background: "hsl(233 100% 81% / .15)",
        border: "none", cursor: "pointer", color: "var(--accent-c)",
        fontSize: 10, lineHeight: 1, padding: 0,
      }}>×</button>
    </span>
  );
}
