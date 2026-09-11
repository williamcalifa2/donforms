"use client";

import { useEffect, useRef, useState } from "react";

const COUNTRIES = [
  { flag: "🇧🇷", name: "Brasil",     code: "+55",  mask: (d: string) => {
    if (!d) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  }},
  { flag: "🇺🇸", name: "USA",        code: "+1",   mask: (d: string) => {
    if (!d) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`;
  }},
  { flag: "🇦🇷", name: "Argentina",  code: "+54",  mask: (d: string) => d },
  { flag: "🇵🇹", name: "Portugal",   code: "+351", mask: (d: string) => d },
  { flag: "🇲🇽", name: "México",     code: "+52",  mask: (d: string) => d },
  { flag: "🇨🇴", name: "Colômbia",   code: "+57",  mask: (d: string) => d },
  { flag: "🇨🇱", name: "Chile",      code: "+56",  mask: (d: string) => d },
  { flag: "🇵🇪", name: "Peru",       code: "+51",  mask: (d: string) => d },
  { flag: "🇺🇾", name: "Uruguai",    code: "+598", mask: (d: string) => d },
  { flag: "🇵🇾", name: "Paraguai",   code: "+595", mask: (d: string) => d },
  { flag: "🇪🇸", name: "Espanha",    code: "+34",  mask: (d: string) => d },
  { flag: "🇩🇪", name: "Alemanha",   code: "+49",  mask: (d: string) => d },
  { flag: "🇬🇧", name: "Reino Unido",code: "+44",  mask: (d: string) => d },
  { flag: "🇮🇹", name: "Itália",     code: "+39",  mask: (d: string) => d },
  { flag: "🇫🇷", name: "França",     code: "+33",  mask: (d: string) => d },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter: () => void;
  primaryColor?: string;
}

export function PhoneField({ value, onChange, placeholder, onEnter, primaryColor = "#7D83BD" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [showDdi, setShowDdi] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    onChange(country.mask(raw));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onEnter();
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const selectCountry = (c: typeof COUNTRIES[0]) => {
    setCountry(c);
    setShowDdi(false);
    // Re-mask existing value with new country
    const digits = value.replace(/\D/g, "").slice(0, 11);
    onChange(c.mask(digits));
    setTimeout(() => ref.current?.focus(), 50);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* DDI dropdown backdrop */}
      {showDdi && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10 }}
          onClick={() => setShowDdi(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
        {/* DDI selector */}
        <button
          type="button"
          onClick={() => setShowDdi(v => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            paddingBottom: "10px",
            borderBottom: `1px solid rgba(125,131,189,0.2)`,
            background: "transparent",
            cursor: "pointer",
            fontSize: "22px",
            lineHeight: 1,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span>{country.flag}</span>
          <span style={{ fontSize: "14px", color: "#ffffff", opacity: 0.6 }}>{country.code}</span>
          <span style={{ fontSize: "10px", color: "#ffffff", opacity: 0.3 }}>▾</span>
        </button>

        {/* DDI dropdown */}
        {showDdi && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 20,
            background: "#1a1a2e",
            border: "1px solid rgba(125,131,189,0.25)",
            borderRadius: "12px",
            overflow: "hidden",
            minWidth: "200px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <div style={{ maxHeight: "260px", overflowY: "auto" }}>
              {COUNTRIES.map(c => (
                <button
                  key={c.code + c.name}
                  type="button"
                  onClick={() => selectCountry(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "9px 14px",
                    background: c.code === country.code ? "rgba(125,131,189,0.15)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{c.flag}</span>
                  <span style={{ flex: 1, fontSize: "13px", color: "#ffffff", opacity: 0.8 }}>{c.name}</span>
                  <span style={{ fontSize: "12px", color: primaryColor, fontWeight: 600 }}>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phone input */}
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "99 9 9999-9999"}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(125,131,189,0.2)",
            outline: "none",
            paddingBottom: "10px",
            fontSize: "26px",
            fontWeight: 400,
            fontFamily: "inherit",
            color: "#ffffff",
            transition: "border-color 0.2s",
          }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.5)"; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.2)"; }}
        />
      </div>
    </div>
  );
}
