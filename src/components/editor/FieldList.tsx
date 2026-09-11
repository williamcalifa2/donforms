"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { FormField, FieldType } from "@/types/database.types";

const FIELD_TYPES: { type: FieldType; label: string; icon: string; color: string }[] = [
  { type: "short_text",      label: "Texto curto",      icon: "T",  color: "bg-blue-500/15 text-blue-400" },
  { type: "long_text",       label: "Texto longo",       icon: "¶",  color: "bg-violet-500/15 text-violet-400" },
  { type: "email",           label: "Email",             icon: "@",  color: "bg-orange-500/15 text-orange-400" },
  { type: "phone",           label: "Telefone",          icon: "📞", color: "bg-teal-500/15 text-teal-400" },
  { type: "number",          label: "Número",            icon: "#",  color: "bg-green-500/15 text-green-400" },
  { type: "date",            label: "Data",              icon: "📅", color: "bg-cyan-500/15 text-cyan-400" },
  { type: "multiple_choice", label: "Múltipla escolha",  icon: "☑",  color: "bg-pink-500/15 text-pink-400" },
  { type: "yes_no",          label: "Sim / Não",         icon: "?",  color: "bg-yellow-500/15 text-yellow-400" },
  { type: "rating",          label: "Avaliação",         icon: "★",  color: "bg-amber-500/15 text-amber-400" },
  { type: "statement",       label: "Declaração",        icon: "✦",  color: "bg-indigo-500/15 text-indigo-400" },
];

const TYPE_COLOR: Record<FieldType, string> = Object.fromEntries(
  FIELD_TYPES.map(({ type, color }) => [type, color])
) as Record<FieldType, string>;

interface Props {
  fields: FormField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: FieldType) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export function FieldList({ fields, selectedId, onSelect, onAdd, onRemove, onMove, onReorder }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== toIdx) {
      onReorder(dragIdx.current, toIdx);
    }
    dragIdx.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOver(null);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            Nenhuma pergunta ainda. Clique em + Adicionar.
          </p>
        )}
        {fields.map((field, idx) => {
          const ft = FIELD_TYPES.find(t => t.type === field.type);
          const isDragTarget = dragOver === idx;
          return (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(field.id)}
              className={cn(
                "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all select-none",
                selectedId === field.id
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground",
                isDragTarget && "ring-2 ring-primary/40 bg-primary/5"
              )}
              style={{ opacity: dragIdx.current === idx ? 0.4 : 1 }}
            >
              {/* Drag handle */}
              <span
                className="shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing text-xs px-0.5"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ fontSize: "10px", lineHeight: 1, letterSpacing: "-1px" }}
              >
                ⋮⋮
              </span>

              <span className={cn("h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0", TYPE_COLOR[field.type])}>
                {ft?.icon}
              </span>
              <span className="flex-1 text-xs truncate">{field.label}</span>

              <div className={cn("flex items-center gap-0.5 transition-opacity", selectedId === field.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <button onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/15 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add picker */}
      <div className="p-2 border-t shrink-0">
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            Adicionar campo
          </button>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tipo de campo</p>
              <button onClick={() => setShowPicker(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {FIELD_TYPES.map(({ type, label, icon, color }) => (
                <button
                  key={type}
                  onClick={() => { onAdd(type); setShowPicker(false); }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <span className={cn("h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0", color)}>
                    {icon}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
