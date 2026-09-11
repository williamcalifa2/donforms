"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter: () => void;
}

export function EmailField({ value, onChange, placeholder, onEnter }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      placeholder={placeholder || "seuemail@exemplo.com"}
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
        transition: "border-color 0.2s",
      }}
      onFocus={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.5)"; }}
      onBlur={e => { e.currentTarget.style.borderBottomColor = "rgba(125,131,189,0.2)"; }}
    />
  );
}
