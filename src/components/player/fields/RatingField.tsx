"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  primaryColor: string;
  scale?: number;
}

export function RatingField({ value, onChange, primaryColor, scale = 5 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = value ? Number(value) : 0;
  const display = hovered ?? selected;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(String(n))}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="transition-all hover:scale-110 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill={n <= display ? primaryColor : "none"}
              stroke={n <= display ? primaryColor : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 opacity-80 transition-colors"
              style={{ opacity: n <= display ? 1 : 0.3 }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {selected > 0 && (
        <p className="text-sm opacity-50">
          {selected === 1 ? "Muito ruim" :
           selected === 2 ? "Ruim" :
           selected === 3 ? "Regular" :
           selected === 4 ? "Bom" :
           "Excelente"}
        </p>
      )}
    </div>
  );
}
