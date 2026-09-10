"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  primaryColor: string;
  onEnter: () => void;
}

export function MultipleChoiceField({ value, onChange, options, primaryColor, onEnter }: Props) {
  // Teclas 1-9 selecionam opção, Enter avança
  const handleKey = useCallback((e: KeyboardEvent) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      onChange(options[num - 1]);
      return;
    }
    if (e.key === "Enter" && value) onEnter();
  }, [options, value, onChange, onEnter]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="space-y-2.5">
      {options.map((opt, idx) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
              // Auto-avança após breve delay (UX Typeform)
              setTimeout(onEnter, 350);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150",
              "hover:border-current/60 hover:bg-current/5",
              selected ? "border-current bg-current/10" : "border-current/20 bg-transparent"
            )}
            style={{ color: "inherit" }}
          >
            {/* Letra da opção */}
            <span
              className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors",
                selected
                  ? "border-transparent text-white"
                  : "border-current/30 bg-transparent"
              )}
              style={selected ? { backgroundColor: primaryColor } : {}}
            >
              {String.fromCharCode(65 + idx)} {/* A, B, C… */}
            </span>
            <span className="text-base">{opt}</span>
          </button>
        );
      })}
      <p className="text-xs opacity-40 mt-2">
        Ou pressione <kbd className="font-mono bg-current/10 px-1 rounded">1</kbd>–
        <kbd className="font-mono bg-current/10 px-1 rounded">{Math.min(options.length, 9)}</kbd>
      </p>
    </div>
  );
}
