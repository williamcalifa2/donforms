"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceOption {
  id: string;         // workspace owner's user_id
  name: string;
  logoUrl: string | null;
  role: string | null; // null = own workspace
}

interface Props {
  current: WorkspaceOption;
  options: WorkspaceOption[];
}

export function WorkspaceSwitcher({ current, options }: Props) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function switchTo(id: string) {
    if (id === current.id || switching) return;
    setSwitching(true);
    setOpen(false);
    await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    router.refresh();
    setSwitching(false);
  }

  const hasMultiple = options.length > 1;
  const initials = current.name.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => hasMultiple && setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", background: "none", border: "none",
          cursor: hasMultiple ? "pointer" : "default",
          padding: 0,
          textAlign: "left",
        }}
      >
        {/* Workspace icon */}
        {current.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.logoUrl} alt={current.name}
            style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "var(--gradient-primary)",
            boxShadow: "0 2px 8px var(--accent-glow)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            {initials}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, lineHeight: 1.2,
            color: "var(--sidebar-text-active)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {switching ? "Trocando…" : current.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>
            {current.role ? `Membro · ${current.role}` : "Workspace"}
          </div>
        </div>

        {hasMultiple && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ flexShrink: 0, opacity: 0.4, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && hasMultiple && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          width: 220,
          background: "var(--sidebar-bg)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "6px",
          zIndex: 100,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => switchTo(opt.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 10px", borderRadius: 8,
                background: opt.id === current.id ? "rgba(108,99,255,0.12)" : "none",
                border: "none", cursor: "pointer", textAlign: "left",
                color: opt.id === current.id ? "var(--accent)" : "var(--sidebar-text)",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (opt.id !== current.id) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (opt.id !== current.id) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {opt.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opt.logoUrl} alt={opt.name}
                  style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                }}>
                  {opt.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opt.name}
                </div>
                <div style={{ fontSize: 10, opacity: 0.45, marginTop: 1 }}>
                  {opt.role ? opt.role : "Seu workspace"}
                </div>
              </div>
              {opt.id === current.id && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
