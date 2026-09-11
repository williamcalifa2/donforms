"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter: () => void;
}

export function LongTextField({ value, onChange, placeholder, onEnter }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onEnter();
        }}
        placeholder={placeholder || "Digite sua resposta…"}
        rows={4}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid rgba(125,131,189,0.2)",
          outline: "none",
          paddingBottom: "10px",
          fontSize: "26px",
          fontWeight: 400,
          fontFamily: "inherit",
          color: "#ffffff",
          resize: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.5)"; }}
        onBlur={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.2)"; }}
      />
      <p style={{ fontSize: "12px", opacity: 0.3 }}>
        Pressione <kbd style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: "4px" }}>Ctrl+Enter</kbd> para avançar
      </p>
    </div>
  );
}
