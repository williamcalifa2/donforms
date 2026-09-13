"use client";

import { useMemo } from "react";

interface BubbleItem {
  label: string;
  count: number;
}

interface Props {
  items: BubbleItem[];
  title?: string;
  subtitle?: string;
  /** Palette override. Defaults to indigo/violet gradient family */
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#7D83BD", "#a78bfa",
];

/** Deterministic pseudo-random from string seed */
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

export function BubbleChart({ items, title, subtitle, colors = DEFAULT_COLORS }: Props) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.count - a.count), [items]);
  const maxCount = Math.max(...sorted.map(i => i.count), 1);

  // Layout: place bubbles in a packed row arrangement using CSS
  // Bubble diameter: 80–180px proportional to sqrt(count/max)
  const bubbles = sorted.map((item, idx) => {
    const ratio = Math.sqrt(item.count / maxCount);
    const size = Math.round(80 + ratio * 100); // 80–180px
    const color = colors[strHash(item.label) % colors.length];
    const pct = Math.round((item.count / maxCount) * 100);
    const animDelay = (idx * 0.7) % 5; // staggered float
    const animDuration = 5 + (strHash(item.label + "d") % 4); // 5–8s
    return { ...item, size, color, pct, animDelay, animDuration };
  });

  if (bubbles.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Sem dados suficientes.
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <style>{`
        @keyframes df-float-a {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-12px) scale(1.02); }
        }
        @keyframes df-float-b {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-8px) scale(0.98); }
        }
        @keyframes df-float-c {
          0%, 100% { transform: translateY(0px) scale(1); }
          33%       { transform: translateY(-14px) scale(1.03); }
          66%       { transform: translateY(4px) scale(0.99); }
        }
        .df-bubble { will-change: transform; transition: filter 0.2s; }
        .df-bubble:hover { filter: brightness(1.15) !important; }
      `}</style>

      {(title || subtitle) && (
        <div>
          {title && <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>{title}</p>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Bubble cloud */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "16px 0",
          minHeight: 180,
        }}
      >
        {bubbles.map((b, i) => {
          const anim = ["df-float-a", "df-float-b", "df-float-c"][i % 3];
          return (
            <div
              key={b.label}
              className="df-bubble"
              title={`${b.label}: ${b.count} resposta${b.count !== 1 ? "s" : ""}`}
              style={{
                width: b.size,
                height: b.size,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${b.color}dd, ${b.color}88)`,
                border: `1.5px solid ${b.color}55`,
                boxShadow: `0 4px 24px ${b.color}44, inset 0 1px 1px rgba(255,255,255,0.15)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                cursor: "default",
                animation: `${anim} ${b.animDuration}s ease-in-out ${b.animDelay}s infinite`,
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: Math.max(9, Math.min(13, b.size / 9)),
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                lineHeight: 1.2,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                maxWidth: b.size - 20,
              }}>
                {b.label}
              </span>
              <span style={{
                fontSize: Math.max(10, Math.min(16, b.size / 8)),
                fontWeight: 900,
                color: "rgba(255,255,255,0.9)",
                marginTop: 2,
              }}>
                {b.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend bar */}
      <div className="flex flex-wrap gap-2 pt-1">
        {bubbles.slice(0, 8).map((b) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {b.label} <span style={{ color: "rgba(255,255,255,0.3)" }}>({b.count})</span>
            </span>
          </div>
        ))}
        {bubbles.length > 8 && (
          <span className="text-[10px] text-muted-foreground">+{bubbles.length - 8} mais</span>
        )}
      </div>
    </div>
  );
}
