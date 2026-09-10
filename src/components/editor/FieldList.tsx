"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FormField, FieldType } from "@/types/database.types";

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "short_text",     label: "Texto curto",     icon: "T" },
  { type: "long_text",      label: "Texto longo",     icon: "¶" },
  { type: "email",          label: "Email",            icon: "@" },
  { type: "number",         label: "Número",           icon: "#" },
  { type: "multiple_choice",label: "Múltipla escolha", icon: "☑" },
];

const TYPE_ICON_COLOR: Record<FieldType, string> = {
  short_text:      "bg-blue-50 text-blue-600",
  long_text:       "bg-violet-50 text-violet-600",
  email:           "bg-orange-50 text-orange-600",
  number:          "bg-green-50 text-green-600",
  multiple_choice: "bg-pink-50 text-pink-600",
};

interface Props {
  fields: FormField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: FieldType) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}

export function FieldList({ fields, selectedId, onSelect, onAdd, onRemove, onMove }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            Nenhuma pergunta ainda. Clique em + Adicionar.
          </p>
        )}
        {fields.map((field, idx) => (
          <div
            key={field.id}
            onClick={() => onSelect(field.id)}
            className={cn(
              "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all",
              selectedId === field.id
                ? "bg-primary/10 text-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Type badge */}
            <span className={cn(
              "h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
              TYPE_ICON_COLOR[field.type]
            )}>
              {FIELD_TYPES.find(t => t.type === field.type)?.icon}
            </span>

            {/* Label */}
            <span className="flex-1 text-xs truncate">{field.label}</span>

            {/* Controls (aparecem no hover ou selecionado) */}
            <div className={cn(
              "flex items-center gap-0.5 transition-opacity",
              selectedId === field.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <button
                onClick={(e) => { e.stopPropagation(); onMove(field.id, "up"); }}
                disabled={idx === 0}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-background disabled:opacity-30 text-xs"
                title="Mover para cima"
              >↑</button>
              <button
                onClick={(e) => { e.stopPropagation(); onMove(field.id, "down"); }}
                disabled={idx === fields.length - 1}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-background disabled:opacity-30 text-xs"
                title="Mover para baixo"
              >↓</button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 hover:text-red-500 text-xs"
                title="Remover"
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add field button + picker */}
      <div className="p-2 border-t shrink-0">
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Adicionar pergunta
          </button>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
              <span className="text-xs font-medium">Tipo de pergunta</span>
              <button
                onClick={() => setShowPicker(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >✕</button>
            </div>
            {FIELD_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => { onAdd(type); setShowPicker(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
              >
                <span className={cn(
                  "h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
                  TYPE_ICON_COLOR[type]
                )}>
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
