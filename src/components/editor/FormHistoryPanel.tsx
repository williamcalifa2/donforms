"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getFormHistory } from "@/app/actions/forms";

type HistoryEntry = {
  id: string;
  created_at: string;
  summary: string;
  user_id: string;
  profiles: { name: string; email: string } | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function HistoryDrawer({
  open,
  entries,
  loaded,
  onClose,
}: {
  open: boolean;
  entries: HistoryEntry[];
  loaded: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.3)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "300px",
          zIndex: 9999,
          background: "#0e0e1a",
          borderLeft: "1px solid rgba(125,131,189,0.15)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7D83BD"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "0.2px" }}>
              Histórico
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "22px", height: "22px", borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)",
              fontSize: "11px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {!loaded && (
            <p style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
              Carregando…
            </p>
          )}
          {loaded && entries.length === 0 && (
            <p style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
              Nenhuma alteração registrada ainda.
            </p>
          )}
          {entries.map((entry, i) => {
            const name = entry.profiles?.name ?? entry.profiles?.email ?? "Usuário";
            const isLast = i === entries.length - 1;
            return (
              <div key={entry.id} style={{ display: "flex", gap: "10px", padding: "9px 16px", position: "relative" }}>
                {!isLast && (
                  <div style={{
                    position: "absolute", left: "27px", top: "34px", bottom: "-9px",
                    width: "1px", background: "rgba(255,255,255,0.05)",
                  }} />
                )}
                {/* Avatar */}
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  background: "rgba(125,131,189,0.15)",
                  border: "1px solid rgba(125,131,189,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "8px", fontWeight: 700, color: "#7D83BD",
                  flexShrink: 0, letterSpacing: "0.5px",
                }}>
                  {initials(name)}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", lineHeight: "1.4", marginBottom: "2px" }}>
                    {entry.summary}
                  </p>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{name}</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)" }}>·</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)" }}>{timeAgo(entry.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}

interface Props {
  formId: string;
}

export function FormHistoryPanel({ formId }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  const handleOpen = () => {
    setOpen(true);
    if (!loaded) {
      startTransition(async () => {
        const data = await getFormHistory(formId);
        setEntries(data);
        setLoaded(true);
      });
    }
  };

  return (
    <>
      {/* Clock button — discreto */}
      <button
        onClick={handleOpen}
        title="Histórico de alterações"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          background: open ? "rgba(125,131,189,0.12)" : "transparent",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = open ? "rgba(125,131,189,0.12)" : "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      <HistoryDrawer
        open={open}
        entries={entries}
        loaded={loaded}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
