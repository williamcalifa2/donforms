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
      className="w-full bg-transparent border-b-2 border-current/30 pb-2 text-xl outline-none transition-colors placeholder:text-current/30 focus:border-current/60"
      style={{ color: "inherit" }}
    />
  );
}
