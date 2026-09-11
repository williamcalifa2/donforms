"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  primaryColor: string;
  onEnter: () => void;
}

export function YesNoField({ value, onChange, primaryColor, onEnter }: Props) {
  const select = (v: string) => { onChange(v); setTimeout(onEnter, 320); };

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {[
        { label: "Sim", val: "sim", key: "S" },
        { label: "Não", val: "nao", key: "N" },
      ].map(({ label, val, key }) => {
        const selected = value === val;
        return (
          <button
            key={val}
            onClick={() => select(val)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 18px",
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
            }}
            onMouseEnter={e => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.2)";
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
            {/* Key tag */}
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
              background: selected ? `${primaryColor}22` : "rgba(255,255,255,0.06)",
              border: selected ? `1px solid ${primaryColor}44` : "1px solid rgba(255,255,255,0.08)",
              color: selected ? primaryColor : "rgba(255,255,255,0.35)",
              flexShrink: 0, transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}>
              {key}
            </span>

            <span style={{
              fontSize: 15, fontWeight: 400,
              color: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)",
              transition: "color 0.15s",
            }}>
              {label}
            </span>

            {selected && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.9 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
