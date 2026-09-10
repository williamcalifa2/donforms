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
        className="w-full bg-transparent border-b-2 border-current/30 pb-2 text-xl outline-none resize-none transition-colors placeholder:text-current/30 focus:border-current/60"
        style={{ color: "inherit" }}
      />
      <p className="text-xs opacity-40">
        Pressione <kbd className="font-mono bg-current/10 px-1 rounded">Ctrl+Enter</kbd> para avançar
      </p>
    </div>
  );
}
