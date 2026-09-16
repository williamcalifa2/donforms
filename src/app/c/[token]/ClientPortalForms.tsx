"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SquaresFour, List, Trash } from "@phosphor-icons/react";
import { deleteFormAsClient } from "@/app/actions/projects";

const STORAGE_KEY = "donforms-client-view";

interface Form {
  id: string;
  title: string;
  is_published: boolean;
  submission_count: number | null;
}

interface Props {
  token: string;
  forms: Form[];
}

export function ClientPortalForms({ token, forms }: Props) {
  const [view, setView] = useState<"card" | "list">(() => {
    if (typeof window === "undefined") return "list";
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s === "card" || s === "list" ? s : "list";
    } catch {
      return "list";
    }
  });

  const handleView = (v: "card" | "list") => {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  };

  if (forms.length === 0) {
    return (
      <div style={{
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
        padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.35)",
      }}>
        <p style={{ margin: "0 0 8px", fontSize: 14 }}>Nenhum formulário ainda.</p>
        <p style={{ margin: 0, fontSize: 13 }}>Crie o primeiro usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 2, padding: 3,
          borderRadius: 10, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {(["list", "card"] as const).map(v => (
            <button
              key={v}
              onClick={() => handleView(v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
                background: view === v ? "rgba(255,255,255,0.15)" : "transparent",
                color: view === v ? "#fff" : "rgba(255,255,255,0.4)",
                transition: "all .15s",
              }}
              title={v === "card" ? "Cards" : "Lista"}
            >
              {v === "card"
                ? <SquaresFour size={15} weight={view === v ? "fill" : "regular"} />
                : <List size={15} weight={view === v ? "bold" : "regular"} />
              }
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {forms.map(form => (
            <FormListRow key={form.id} form={form} token={token} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {forms.map(form => (
            <FormCardItem key={form.id} form={form} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormListRow({ form, token }: { form: Form; token: string }) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Excluir "${form.title}"?`)) return;
    startTransition(async () => {
      await deleteFormAsClient(token, form.id);
    });
  };

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
      background: "rgba(255,255,255,0.025)", padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      opacity: pending ? 0.5 : 1, transition: "opacity .2s",
    }}>
      {/* Status dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: form.is_published ? "#4ade80" : "rgba(255,255,255,0.2)",
      }} />

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: "0 0 2px", fontSize: 14, fontWeight: 600,
          color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {form.title}
        </p>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          {form.submission_count ?? 0} resposta{(form.submission_count ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link href={`/c/${token}/forms/${form.id}/edit`} style={{
          fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
          background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
          textDecoration: "none", border: "1px solid rgba(158,168,255,0.2)",
        }}>
          Editar
        </Link>
        <button
          onClick={handleDelete}
          disabled={pending}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(255,80,80,0.2)",
            background: "rgba(255,80,80,0.08)", color: "rgba(255,100,100,0.7)",
            cursor: "pointer",
          }}
          title="Excluir"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

function FormCardItem({ form, token }: { form: Form; token: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${form.title}"?`)) return;
    startTransition(async () => {
      await deleteFormAsClient(token, form.id);
    });
  };

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
      background: "rgba(255,255,255,0.025)", padding: "18px 18px 14px",
      display: "flex", flexDirection: "column", gap: 10,
      opacity: pending ? 0.5 : 1, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)",
          lineHeight: 1.4,
        }}>
          {form.title}
        </p>
        {/* ... menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", flexShrink: 0, fontSize: 14, letterSpacing: 1,
            }}
            title="Opções"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
              />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20,
                background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, overflow: "hidden", minWidth: 120,
              }}>
                <button
                  onClick={handleDelete}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "9px 14px", border: "none",
                    background: "transparent", color: "rgba(255,100,100,0.85)",
                    cursor: "pointer", fontSize: 13,
                  }}
                >
                  <Trash size={13} weight="bold" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: form.is_published ? "#4ade80" : "rgba(255,255,255,0.2)",
        }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {form.is_published ? "Publicado" : "Rascunho"} · {form.submission_count ?? 0} resp.
        </span>
      </div>

      <Link href={`/c/${token}/forms/${form.id}/edit`} style={{
        fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8,
        background: "rgba(158,168,255,0.12)", color: "#9ea8ff",
        textDecoration: "none", border: "1px solid rgba(158,168,255,0.2)",
        textAlign: "center", display: "block",
      }}>
        Editar
      </Link>
    </div>
  );
}
