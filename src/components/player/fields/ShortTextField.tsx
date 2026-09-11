"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  primaryColor: string;
  onEnter: () => void;
}

export function ShortTextField({ value, onChange, placeholder, primaryColor, onEnter }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      placeholder={placeholder || "Digite sua resposta…"}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${primaryColor}26`,
        outline: "none",
        paddingBottom: "10px",
        fontSize: "26px",
        fontWeight: 400,
        fontFamily: "inherit",
        color: "#ffffff",
        transition: "border-color 0.2s",
      }}
      onFocus={e => { e.currentTarget.style.borderBottomColor = `${primaryColor}66`; }}
      onBlur={e => { e.currentTarget.style.borderBottomColor = `${primaryColor}26`; }}
      className="placeholder-style"
    />
  );
}
