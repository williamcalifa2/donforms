"use client";

import { useState } from "react";
import type { Form, Submission } from "@/types/database.types";
import { isMqlByField } from "@/lib/score";
import { formatDate } from "@/lib/utils";

function getLeadName(answers: Record<string, string | string[] | number>, form: Form): string {
  const nameField = form.fields.find(f => f.type !== "statement" && /nome|name/i.test(f.label));
  if (nameField && answers[nameField.id]) return String(answers[nameField.id]);
  // fallback: primeiro campo de texto respondido
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

interface LeadModalProps {
  sub: Submission;
  form: Form;
  isMql: boolean;
  onClose: () => void;
}

function LeadModal({ sub, form, isMql, onClose }: LeadModalProps) {
  const inputFields = form.fields.filter(f => f.type !== "statement");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
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
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                {getLeadName(sub.answers, form)}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                {formatDate(sub.created_at)}
              </p>
            </div>
            {isMql && (
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: "#4ade80",
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: "20px",
                padding: "3px 10px",
                letterSpacing: "0.5px",
              }}>
                ✓ MQL
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px", height: "28px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Answers */}
        <div style={{ overflow: "auto", flex: 1, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {inputFields.map(field => {
              const raw = sub.answers[field.id];
              const display = raw == null ? null : Array.isArray(raw) ? raw.join(", ") : String(raw);
              const isMqlField = !!field.isMqlField;
              return (
                <div key={field.id}>
                  <p style={{
                    fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
                    color: isMqlField ? "#7D83BD" : "rgba(255,255,255,0.35)",
                    marginBottom: "4px",
                  }}>
                    {field.label}
                  </p>
                  <p style={{
                    fontSize: "14px",
                    color: display ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
                    fontStyle: display ? "normal" : "italic",
                  }}>
                    {display ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* UTM metadata */}
          {sub.metadata && Object.keys(sub.metadata).some(k => k.startsWith("utm_") && (sub.metadata as Record<string, string>)[k]) && (
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
                UTM
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const).map(k => {
                  const v = (sub.metadata as Record<string, string>)[k];
                  if (!v) return null;
                  return (
                    <span key={k} style={{
                      fontSize: "11px", fontFamily: "monospace",
                      color: "#7D83BD",
                      background: "rgba(125,131,189,0.1)",
                      border: "1px solid rgba(125,131,189,0.2)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                    }}>
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

interface Props {
  form: Form;
  submissions: Submission[];
  utmParam: string;
}

export function ResponseCards({ form, submissions, utmParam }: Props) {
  const [selected, setSelected] = useState<Submission | null>(null);
  const inputFields = form.fields.filter(f => f.type !== "statement");

  return (
    <>
      {submissions.length === 0 && (
        <div style={{
          border: "2px dashed rgba(255,255,255,0.1)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          gap: "8px",
          color: "rgba(255,255,255,0.3)",
        }}>
          <span style={{ fontSize: "40px" }}>📭</span>
          <p style={{ fontSize: "14px", fontWeight: 500 }}>Nenhuma resposta ainda</p>
          <p style={{ fontSize: "12px" }}>Compartilhe o formulário para receber leads.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {submissions.map((sub, i) => {
          const mql = isMqlByField(sub.answers, inputFields);
          const name = getLeadName(sub.answers, form);
          const email = getLeadEmail(sub.answers, form);
          const utmVal = (sub.metadata as Record<string, string>)[utmParam];

          return (
            <button
              key={sub.id}
              onClick={() => setSelected(sub)}
              style={{
                background: "var(--card-bg)",
                border: `1px solid ${mql ? "rgba(74,222,128,0.2)" : "var(--card-border)"}`,
                borderRadius: "14px",
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = mql ? "rgba(74,222,128,0.4)" : "rgba(125,131,189,0.35)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = mql ? "rgba(74,222,128,0.2)" : "var(--card-border)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                {/* Number badge */}
                <span style={{
                  fontSize: "10px", fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  padding: "2px 6px",
                }}>
                  #{submissions.length - i}
                </span>
                {mql && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px",
                    color: "#4ade80",
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: "20px",
                    padding: "2px 8px",
                  }}>
                    MQL
                  </span>
                )}
              </div>

              {/* Name */}
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: "3px", lineHeight: 1.3 }}>
                {name}
              </p>

              {/* Email */}
              {email && (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>
                  {email}
                </p>
              )}

              {/* Preview de campos (primeiros 2 não-name/email) */}
              {(() => {
                const preview = inputFields
                  .filter(f => {
                    const val = sub.answers[f.id];
                    return val && !(/nome|name/i.test(f.label)) && f.type !== "email";
                  })
                  .slice(0, 2);
                if (preview.length === 0) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                    {preview.map(f => (
                      <div key={f.id} style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{f.label}:</span>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {String(sub.answers[f.id])}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                  {formatDate(sub.created_at)}
                </span>
                {utmVal && (
                  <span style={{
                    fontSize: "9px", fontFamily: "monospace", fontWeight: 600,
                    color: "#7D83BD",
                    background: "rgba(125,131,189,0.1)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                  }}>
                    {utmVal}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lead detail modal */}
      {selected && (
        <LeadModal
          sub={selected}
          form={form}
          isMql={isMqlByField(selected.answers, inputFields)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
