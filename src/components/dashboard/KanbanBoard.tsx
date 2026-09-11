"use client";

import { useState, useTransition, useRef } from "react";
import { updateSubmissionStatus } from "@/app/actions/forms";
import { isMqlByField } from "@/lib/score";
import type { Submission, FormField } from "@/types/database.types";


// ─── Config ───────────────────────────────────────────────────────────────────
const COLUMNS: { id: string; label: string; color: string; dot: string }[] = [
  { id: "novo",          label: "Novo",          color: "rgba(255,255,255,0.06)", dot: "rgba(255,255,255,0.3)" },
  { id: "qualificado",   label: "Qualificado",   color: "rgba(125,131,189,0.10)", dot: "#7D83BD" },
  { id: "em_negociacao", label: "Em negociação", color: "rgba(251,191,36,0.08)",  dot: "#fbbf24" },
  { id: "fechado",       label: "Fechado",       color: "rgba(34,197,94,0.08)",   dot: "#4ade80" },
];

function getLeadName(answers: Record<string, string | string[] | number>, fields: FormField[]): string {
  const nameField = fields.find(f =>
    f.type !== "statement" &&
    /nome|name/i.test(f.label)
  );
  if (nameField) {
    const val = answers[nameField.id];
    if (val) return String(val);
  }
  // fallback: primeiro campo de texto respondido
  for (const f of fields) {
    if (f.type !== "statement" && f.type !== "multiple_choice" && f.type !== "yes_no") {
      const val = answers[f.id];
      if (val) return String(val);
    }
  }
  return "Lead sem nome";
}

function getLeadEmail(answers: Record<string, string | string[] | number>, fields: FormField[]): string | null {
  const emailField = fields.find(f => f.type === "email");
  if (emailField && answers[emailField.id]) return String(answers[emailField.id]);
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function MqlBadge({ isMql }: { isMql: boolean }) {
  if (!isMql) return null;
  return (
    <span style={{
      fontSize: "9px",
      fontWeight: 700,
      color: "#4ade80",
      background: "rgba(74,222,128,0.1)",
      border: "1px solid rgba(74,222,128,0.25)",
      borderRadius: "8px",
      padding: "1px 6px",
      letterSpacing: "0.5px",
    }}>
      MQL
    </span>
  );
}

// ─── Lead Modal ───────────────────────────────────────────────────────────────
function LeadModal({ sub, fields, isMql, onClose }: {
  sub: Submission;
  fields: FormField[];
  isMql: boolean;
  onClose: () => void;
}) {
  const inputFields = fields.filter(f => f.type !== "statement");
  const name = getLeadName(sub.answers, fields);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div
        style={{
          position: "relative",
          background: "#13131f",
          border: "1px solid rgba(125,131,189,0.2)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{name}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{formatDate(sub.created_at)}</p>
            </div>
            {isMql && (
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "20px", padding: "3px 10px", letterSpacing: "0.5px" }}>
                ✓ MQL
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {inputFields.map(field => {
              const raw = sub.answers[field.id];
              const display = raw == null ? null : Array.isArray(raw) ? raw.join(", ") : String(raw);
              return (
                <div key={field.id}>
                  <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: field.isMqlField ? "#7D83BD" : "rgba(255,255,255,0.35)", marginBottom: "4px" }}>
                    {field.label}
                  </p>
                  <p style={{ fontSize: "14px", color: display ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)", fontStyle: display ? "normal" : "italic" }}>
                    {display ?? "—"}
                  </p>
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
                  return (
                    <span key={k} style={{ fontSize: "11px", fontFamily: "monospace", color: "#7D83BD", background: "rgba(125,131,189,0.1)", border: "1px solid rgba(125,131,189,0.2)", borderRadius: "6px", padding: "2px 8px" }}>
                      {k.replace("utm_", "")}={v}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function LeadCard({
  sub,
  fields,
  isMql,
  onDragStart,
  onClick,
}: {
  sub: Submission;
  fields: FormField[];
  isMql: boolean;
  onDragStart: (id: string) => void;
  onClick: () => void;
}) {
  const name = getLeadName(sub.answers, fields);
  const email = getLeadEmail(sub.answers, fields);

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(sub.id); }}
      onClick={onClick}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "10px",
        padding: "10px 12px",
        cursor: "pointer",
        userSelect: "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(125,131,189,0.35)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--card-border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: "1.3" }}>
          {name}
        </p>
        <MqlBadge isMql={isMql} />
      </div>
      {email && (
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>{email}</p>
      )}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
          {formatDate(sub.created_at)}
        </span>
        {sub.metadata?.utm_source && (
          <span style={{
            fontSize: "9px",
            fontWeight: 600,
            color: "#7D83BD",
            background: "rgba(125,131,189,0.12)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}>
            {String(sub.metadata.utm_source)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────
interface Props {
  submissions: Submission[];
  fields: FormField[];
}

export function KanbanBoard({ submissions: initialSubs, fields }: Props) {
  const [, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<(Submission & { isMql: boolean }) | null>(null);

  // Status local para optimistic update
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of initialSubs) map[s.id] = (s as Submission & { status?: string }).status ?? "novo";
    return map;
  });

  // Calcula MQL por campo de faturamento (campo com isMqlField: true)
  const subsWithMql = initialSubs.map(s => ({
    ...s,
    isMql: isMqlByField(s.answers, fields),
  }));

  const handleDrop = (colId: string) => {
    const id = dragId.current;
    if (!id || statuses[id] === colId) return;

    setStatuses(prev => ({ ...prev, [id]: colId }));
    startTransition(async () => {
      await updateSubmissionStatus(id, colId);
    });
    dragId.current = null;
    setOverCol(null);
  };

  const hasMqlConfig = fields.some(f => f.isMqlField);

  return (
    <div>
      {!hasMqlConfig && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: "rgba(125,131,189,0.08)", border: "1px solid rgba(125,131,189,0.2)", color: "#CBCDE5" }}
        >
          <span style={{ fontSize: "16px" }}>💡</span>
          <span>Configure o campo de faturamento em Configurações → Qualificação MQL para ver badges MQL aqui.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", minHeight: "500px" }}>
        {COLUMNS.map(col => {
          const colSubs = subsWithMql
            .filter(s => (statuses[s.id] ?? "novo") === col.id)
            .sort((a, b) => (b.isMql ? 1 : 0) - (a.isMql ? 1 : 0)); // MQLs primeiro

          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => handleDrop(col.id)}
              style={{
                background: overCol === col.id ? `${col.color.replace(/[\d.]+\)$/, "0.18)")}` : col.color,
                border: overCol === col.id
                  ? `2px dashed ${col.dot}`
                  : "2px dashed rgba(255,255,255,0.07)",
                borderRadius: "14px",
                padding: "12px",
                transition: "background 0.15s, border-color 0.15s",
                minHeight: "480px",
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{
                    width: "8px", height: "8px",
                    borderRadius: "50%",
                    background: col.dot,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${col.dot}88`,
                  }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.3px" }}>
                    {col.label}
                  </span>
                </div>
                <span style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  padding: "1px 7px",
                  fontWeight: 600,
                }}>
                  {colSubs.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {colSubs.map(sub => (
                  <LeadCard
                    key={sub.id}
                    sub={sub}
                    fields={fields}
                    isMql={sub.isMql}
                    onDragStart={id => { dragId.current = id; }}
                    onClick={() => setSelectedSub(sub)}
                  />
                ))}
                {colSubs.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    paddingTop: "40px",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.15)",
                  }}>
                    Arraste leads aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSub && (
        <LeadModal
          sub={selectedSub}
          fields={fields}
          isMql={selectedSub.isMql}
          onClose={() => setSelectedSub(null)}
        />
      )}
    </div>
  );
}
