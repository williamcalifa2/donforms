"use client";

import { useState, useMemo } from "react";
import type { Form, Submission } from "@/types/database.types";
import { isMqlByField } from "@/lib/score";
import { formatDate } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLeadName(answers: Record<string, string | string[] | number>, form: Form): string {
  const nameField = form.fields.find(f => f.type !== "statement" && /nome|name/i.test(f.label));
  if (nameField && answers[nameField.id]) return String(answers[nameField.id]);
  for (const f of form.fields) {
    if (["short_text", "long_text"].includes(f.type) && answers[f.id]) return String(answers[f.id]);
  }
  return "Lead sem nome";
}

function getLeadEmail(answers: Record<string, string | string[] | number>, form: Form): string | null {
  const ef = form.fields.find(f => f.type === "email");
  if (ef && answers[ef.id]) return String(answers[ef.id]);
  return null;
}

// ─── Lead Modal ───────────────────────────────────────────────────────────────
interface LeadModalProps { sub: Submission; form: Form; isMql: boolean; onClose: () => void; }

function LeadModal({ sub, form, isMql, onClose }: LeadModalProps) {
  const inputFields = form.fields.filter(f => f.type !== "statement");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{getLeadName(sub.answers, form)}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{formatDate(sub.created_at)}</p>
            </div>
            {isMql && <span style={{ fontSize: "10px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "20px", padding: "3px 10px", letterSpacing: "0.5px" }}>✓ MQL</span>}
          </div>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {inputFields.map(field => {
              const raw = sub.answers[field.id];
              const display = raw == null ? null : Array.isArray(raw) ? raw.join(", ") : String(raw);
              return (
                <div key={field.id}>
                  <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: field.isMqlField ? "#7D83BD" : "rgba(255,255,255,0.35)", marginBottom: "4px" }}>{field.label}</p>
                  <p style={{ fontSize: "14px", color: display ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)", fontStyle: display ? "normal" : "italic" }}>{display ?? "—"}</p>
                </div>
              );
            })}
          </div>
          {sub.metadata && Object.keys(sub.metadata).some(k => k.startsWith("utm_") && (sub.metadata as Record<string, string>)[k]) && (
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>UTM</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const).map(k => {
                  const v = (sub.metadata as Record<string, string>)[k];
                  if (!v) return null;
                  return <span key={k} style={{ fontSize: "11px", fontFamily: "monospace", color: "#7D83BD", background: "rgba(125,131,189,0.1)", border: "1px solid rgba(125,131,189,0.2)", borderRadius: "6px", padding: "2px 8px" }}>{k.replace("utm_", "")}={v}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CSV export helper ────────────────────────────────────────────────────────
function exportCsv(form: Form, filtered: Submission[]) {
  const inputFields = form.fields.filter(f => f.type !== "statement");
  const headers = ["Data", ...inputFields.map(f => f.label), "Status", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content", "Referrer"];
  const rows = filtered.map(sub => {
    const mql = isMqlByField(sub.answers, inputFields);
    const answers = inputFields.map(f => {
      const val = sub.answers[f.id];
      if (val == null) return "";
      if (Array.isArray(val)) return val.join("; ");
      return String(val).replace(/"/g, '""');
    });
    return [
      new Date(sub.created_at).toLocaleString("pt-BR"),
      ...answers,
      mql ? "MQL" : "Lead",
      sub.metadata?.utm_source ?? "",
      sub.metadata?.utm_medium ?? "",
      sub.metadata?.utm_campaign ?? "",
      sub.metadata?.utm_term ?? "",
      sub.metadata?.utm_content ?? "",
      sub.metadata?.referrer ?? "",
    ];
  });
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${form.title.replace(/[^a-z0-9]/gi, "_")}_respostas.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter types ─────────────────────────────────────────────────────────────
type DatePreset = "all" | "today" | "7d" | "30d";
type StatusFilter = "all" | "mql" | "not_mql";

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { form: Form; submissions: Submission[]; utmParam: string; }

export function ResponseCards({ form, submissions, utmParam }: Props) {
  const [selected, setSelected] = useState<Submission | null>(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [status, setStatus]         = useState<StatusFilter>("all");
  const [utmFilter, setUtmFilter]   = useState("all");

  const inputFields = form.fields.filter(f => f.type !== "statement");

  // Unique UTM source values for dropdown
  const utmSources = useMemo(() => {
    const vals = new Set<string>();
    submissions.forEach(s => {
      const v = (s.metadata as Record<string, string>)?.utm_source;
      if (v) vals.add(v);
    });
    return Array.from(vals).sort();
  }, [submissions]);

  // Apply filters
  const filtered = useMemo(() => {
    const now = Date.now();
    return submissions.filter(sub => {
      // Date filter
      if (datePreset !== "all") {
        const ms = now - new Date(sub.created_at).getTime();
        if (datePreset === "today" && ms > 86400000) return false;
        if (datePreset === "7d"    && ms > 7  * 86400000) return false;
        if (datePreset === "30d"   && ms > 30 * 86400000) return false;
      }

      // Status filter
      if (status !== "all") {
        const mql = isMqlByField(sub.answers, inputFields);
        if (status === "mql"     && !mql) return false;
        if (status === "not_mql" &&  mql) return false;
      }

      // UTM filter
      if (utmFilter !== "all") {
        const src = (sub.metadata as Record<string, string>)?.utm_source;
        if (src !== utmFilter) return false;
      }

      // Text search across all answer values
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = Object.values(sub.answers)
          .map(v => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [submissions, datePreset, status, utmFilter, search, inputFields]);

  const hasFilters = datePreset !== "all" || status !== "all" || utmFilter !== "all" || search.trim() !== "";

  // Shared input style
  const filterStyle: React.CSSProperties = {
    padding: "7px 11px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "12px",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <>
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      {submissions.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar em respostas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...filterStyle, flex: "1 1 180px", minWidth: 160, cursor: "text" }}
          />

          {/* Date preset */}
          <select value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)} style={filterStyle}>
            <option value="all">Qualquer data</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>

          {/* Status */}
          <select value={status} onChange={e => setStatus(e.target.value as StatusFilter)} style={filterStyle}>
            <option value="all">Todos os leads</option>
            <option value="mql">Apenas MQL</option>
            <option value="not_mql">Não MQL</option>
          </select>

          {/* UTM source */}
          {utmSources.length > 0 && (
            <select value={utmFilter} onChange={e => setUtmFilter(e.target.value)} style={filterStyle}>
              <option value="all">Todas as origens</option>
              {utmSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setDatePreset("all"); setStatus("all"); setUtmFilter("all"); }}
              style={{ ...filterStyle, color: "rgba(255,255,255,0.4)", background: "transparent", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Limpar filtros
            </button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Results count + export */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
              {filtered.length} de {submissions.length}
            </span>
            <button
              onClick={() => exportCsv(form, filtered)}
              disabled={filtered.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 12px", borderRadius: "8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: filtered.length === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                fontSize: "12px", fontFamily: "inherit",
                cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (filtered.length > 0) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = filtered.length === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar CSV {hasFilters && filtered.length < submissions.length ? `(${filtered.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {submissions.length === 0 && (
        <div style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "8px", color: "rgba(255,255,255,0.3)" }}>
          <span style={{ fontSize: "40px" }}>📭</span>
          <p style={{ fontSize: "14px", fontWeight: 500 }}>Nenhuma resposta ainda</p>
          <p style={{ fontSize: "12px" }}>Compartilhe o formulário para receber leads.</p>
        </div>
      )}

      {/* ── No results after filter ──────────────────────────────────── */}
      {submissions.length > 0 && filtered.length === 0 && (
        <div style={{ border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: "6px", color: "rgba(255,255,255,0.3)" }}>
          <span style={{ fontSize: "28px" }}>🔍</span>
          <p style={{ fontSize: "13px", fontWeight: 500 }}>Nenhum resultado com esses filtros</p>
          <button onClick={() => { setSearch(""); setDatePreset("all"); setStatus("all"); setUtmFilter("all"); }} style={{ marginTop: "4px", fontSize: "12px", color: "#7D83BD", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Limpar filtros</button>
        </div>
      )}

      {/* ── Cards grid ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {filtered.map((sub, i) => {
          const mql = isMqlByField(sub.answers, inputFields);
          const name = getLeadName(sub.answers, form);
          const email = getLeadEmail(sub.answers, form);
          const utmVal = (sub.metadata as Record<string, string>)[utmParam];

          return (
            <button
              key={sub.id}
              onClick={() => setSelected(sub)}
              style={{ background: "var(--card-bg)", border: `1px solid ${mql ? "rgba(74,222,128,0.2)" : "var(--card-border)"}`, borderRadius: "14px", padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = mql ? "rgba(74,222,128,0.4)" : "rgba(125,131,189,0.35)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = mql ? "rgba(74,222,128,0.2)" : "var(--card-border)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "2px 6px" }}>
                  #{submissions.length - submissions.indexOf(sub)}
                </span>
                {mql && <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px", padding: "2px 8px" }}>MQL</span>}
              </div>

              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: "3px", lineHeight: 1.3 }}>{name}</p>
              {email && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>{email}</p>}

              {(() => {
                const preview = inputFields.filter(f => { const val = sub.answers[f.id]; return val && !(/nome|name/i.test(f.label)) && f.type !== "email"; }).slice(0, 2);
                if (preview.length === 0) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                    {preview.map(f => (
                      <div key={f.id} style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{f.label}:</span>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(sub.answers[f.id])}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{formatDate(sub.created_at)}</span>
                {utmVal && <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 600, color: "#7D83BD", background: "rgba(125,131,189,0.1)", borderRadius: "4px", padding: "2px 6px" }}>{utmVal}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && <LeadModal sub={selected} form={form} isMql={isMqlByField(selected.answers, inputFields)} onClose={() => setSelected(null)} />}
    </>
  );
}
