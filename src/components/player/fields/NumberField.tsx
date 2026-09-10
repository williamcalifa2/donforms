"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  onEnter: () => void;
}

export function NumberField({ value, onChange, placeholder, min, max, onEnter }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      placeholder={placeholder || "0"}
      min={min}
      max={max}
      className="w-full bg-transparent border-b-2 border-current/30 pb-2 text-xl outline-none transition-colors placeholder:text-current/30 focus:border-current/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      style={{ color: "inherit" }}
    />
  );
}
