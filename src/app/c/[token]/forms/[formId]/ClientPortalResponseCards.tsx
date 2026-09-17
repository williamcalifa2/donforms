"use client";

import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";

type Field = { id: string; label: string; type: string };
type Submission = {
  id: string;
  created_at: string;
  answers: Record<string, unknown> | null;
};

interface Props {
  submissions: Submission[];
  fields: Field[];
  formTitle: string;
}

type DatePreset = "all" | "today" | "7d" | "30d";
type ViewMode = "cards" | "list";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLeadName(answers: Record<string, unknown>, fields: Field[]): string {
  const nameField = fields.find(f => f.type !== "statement" && /nome|name/i.test(f.label));
  if (nameField && answers[nameField.id]) return String(answers[nameField.id]);
  for (const f of fields) {
    if (["short_text", "long_text"].includes(f.type) && answers[f.id]) return String(answers[f.id]);
  }
  return "Lead sem nome";
}

function getLeadEmail(answers: Record<string, unknown>, fields: Field[]): string | null {
  const ef = fields.find(f => f.type === "email");
  if (ef && answers[ef.id]) return String(answers[ef.id]);
  return null;
}

function exportCsv(formTitle: string, fields: Field[], filtered: Submission[]) {
  const headers = ["Data", ...fields.map(f => f.label)];
  const rows = filtered.map(sub => [
    new Date(sub.created_at).toLocaleString("pt-BR"),
    ...fields.map(f => {
      const val = sub.answers?.[f.id];
      if (val == null) return "";
      if (Array.isArray(val)) return val.join("; ");
      return String(val).replace(/"/g, '""');
    }),
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${formTitle.replace(/[^a-z0-9]/gi, "_")}_respostas.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Lead Modal ───────────────────────────────────────────────────────────────

function LeadModal({ sub, fields, onClose }: { sub: Submission; fields: Field[]; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div
        style={{ position: "relative", background: "var(--card-bg, #111)", border: "1px solid var(--card-border, rgba(255,255,255,0.1))", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: 0 }}>{getLeadName(sub.answers ?? {}, fields)}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>{formatDate(sub.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fields.map(field => {
              const raw = sub.answers?.[field.id];
              const display = raw == null ? null : Array.isArray(raw) ? raw.join(", ") : String(raw);
              return (
                <div key={field.id}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 4px" }}>{field.label}</p>
                  <p style={{ fontSize: 14, color: display ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)", fontStyle: display ? "normal" : "italic", margin: 0 }}>{display ?? "—"}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ClientPortalResponseCards({ submissions, fields, formTitle }: Props) {
  const [selected, setSelected] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const filtered = useMemo(() => {
    const now = Date.now();
    return submissions.filter(sub => {
      if (datePreset !== "all") {
        const ms = now - new Date(sub.created_at).getTime();
        if (datePreset === "today" && ms > 86400000) return false;
        if (datePreset === "7d"    && ms > 7  * 86400000) return false;
        if (datePreset === "30d"   && ms > 30 * 86400000) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = Object.values(sub.answers ?? {}).map(v => Array.isArray(v) ? v.join(" ") : String(v ?? "")).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, datePreset, search]);

  const hasFilters = datePreset !== "all" || search.trim() !== "";

  const filterStyle: React.CSSProperties = {
    padding: "7px 11px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.75)", fontSize: 12, outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  };

  if (submissions.length === 0) {
    return (
      <div style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 8, color: "rgba(255,255,255,0.3)" }}>
        <span style={{ fontSize: 40 }}>📭</span>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Nenhuma resposta ainda</p>
        <p style={{ fontSize: 12, margin: 0 }}>Compartilhe o formulário para receber respostas.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar em respostas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...filterStyle, flex: "1 1 180px", minWidth: 160, cursor: "text" }}
        />
        <select value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)} style={filterStyle}>
          <option value="all">Qualquer data</option>
          <option value="today">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setDatePreset("all"); }} style={{ ...filterStyle, color: "rgba(255,255,255,0.4)", background: "transparent" }}>
            Limpar
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
            {filtered.length} de {submissions.length}
          </span>
          {/* View toggle */}
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["cards", "list"] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} title={mode === "cards" ? "Cards" : "Lista"}
                style={{ padding: "6px 10px", border: "none", cursor: "pointer", fontFamily: "inherit", background: viewMode === mode ? "rgba(125,131,189,0.2)" : "rgba(255,255,255,0.03)", color: viewMode === mode ? "#CBCDE5" : "rgba(255,255,255,0.3)", transition: "all 0.15s" }}>
                {mode === "cards"
                  ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><line x1="1" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </button>
            ))}
          </div>
          {/* Export CSV */}
          <button
            onClick={() => exportCsv(formTitle, fields, filtered)}
            disabled={filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: filtered.length === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "inherit", cursor: filtered.length === 0 ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
            onMouseEnter={e => { if (filtered.length > 0) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = filtered.length === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ── No results ─────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{ border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 6, color: "rgba(255,255,255,0.3)" }}>
          <span style={{ fontSize: 28 }}>🔍</span>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Nenhum resultado com esses filtros</p>
          <button onClick={() => { setSearch(""); setDatePreset("all"); }} style={{ marginTop: 4, fontSize: 12, color: "#7D83BD", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Limpar filtros</button>
        </div>
      )}

      {/* ── Cards grid ─────────────────────────────────────────────────── */}
      {viewMode === "cards" && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((sub, idx) => {
            const ans = sub.answers ?? {};
            const name = getLeadName(ans, fields);
            const email = getLeadEmail(ans, fields);
            const preview = fields.filter(f => { const v = ans[f.id]; return v && !(/nome|name/i.test(f.label)) && f.type !== "email"; }).slice(0, 2);

            return (
              <button key={sub.id} onClick={() => setSelected(sub)}
                style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid var(--card-border, rgba(255,255,255,0.08))", borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s", width: "100%" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(125,131,189,0.35)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--card-border, rgba(255,255,255,0.08))"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 6px" }}>
                    #{submissions.length - idx}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 3, lineHeight: 1.3 }}>{name}</p>
                {email && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>{email}</p>}
                {preview.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                    {preview.map(f => (
                      <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{f.label}:</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(ans[f.id])}</span>
                      </div>
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatDate(sub.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────────── */}
      {viewMode === "list" && filtered.length > 0 && (
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 80px", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["Nome", "Email", "Data", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{h}</span>
            ))}
          </div>
          {filtered.map(sub => {
            const ans = sub.answers ?? {};
            const name = getLeadName(ans, fields);
            const email = getLeadEmail(ans, fields);
            return (
              <div key={sub.id} onClick={() => setSelected(sub)}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 80px", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "background 0.12s", alignItems: "center" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email ?? "—"}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{formatDate(sub.created_at)}</span>
                <span style={{ fontSize: 11, color: "rgba(125,131,189,0.6)", textAlign: "right" }}>Ver →</span>
              </div>
            );
          })}
        </div>
      )}

      {selected && <LeadModal sub={selected} fields={fields} onClose={() => setSelected(null)} />}
    </>
  );
}
