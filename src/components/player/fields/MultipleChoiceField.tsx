"use client";

import { useEffect, useCallback } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  primaryColor: string;
  onEnter: () => void;
}

export function MultipleChoiceField({ value, onChange, options, primaryColor, onEnter }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    const code = e.key.toUpperCase();
    if (code.length === 1 && code >= "A" && code <= "Z") {
      const idx = code.charCodeAt(0) - 65;
      if (idx < options.length) { onChange(options[idx]); return; }
    }
    if (e.key === "Enter" && value) onEnter();
  }, [options, value, onChange, onEnter]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt, idx) => {
        const selected = value === opt;
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setTimeout(onEnter, 320); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 16px",
              borderRadius: 12,
              border: selected
                ? `1px solid ${primaryColor}66`
                : "1px solid rgba(255,255,255,0.1)",
              background: selected
                ? `${primaryColor}12`
                : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              outline: "none",
              transform: selected ? "translateX(2px)" : "translateX(0)",
            }}
            onMouseEnter={e => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.border = `1px solid rgba(255,255,255,0.2)`;
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              }
            }}
            onMouseLeave={e => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
              }
            }}
          >
            {/* Letter tag */}
            <span style={{
              width: 22, height: 22,
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
              flexShrink: 0,
              background: selected ? `${primaryColor}22` : "rgba(255,255,255,0.06)",
              border: selected ? `1px solid ${primaryColor}44` : "1px solid rgba(255,255,255,0.08)",
              color: selected ? primaryColor : "rgba(255,255,255,0.35)",
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}>
              {letter}
            </span>

            {/* Option text */}
            <span style={{
              fontSize: 15,
              fontWeight: 400,
              color: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)",
              lineHeight: 1.4,
              flex: 1,
              transition: "color 0.15s",
            }}>
              {opt}
            </span>

            {/* Check */}
            {selected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, opacity: 0.9 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        );
      })}

      {/* Keyboard hint */}
      <p style={{
        fontSize: 11, color: "rgba(255,255,255,0.22)",
        marginTop: 4, display: "flex", alignItems: "center", gap: 4,
      }}>
        Ou pressione
        <span style={{
          fontFamily: "monospace",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4, padding: "1px 5px", fontSize: 10,
        }}>A</span>
        –
        <span style={{
          fontFamily: "monospace",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4, padding: "1px 5px", fontSize: 10,
        }}>{String.fromCharCode(64 + Math.min(options.length, 26))}</span>
      </p>
    </div>
  );
}
