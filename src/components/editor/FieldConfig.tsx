"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormField } from "@/types/database.types";

const TYPE_LABELS: Record<FormField["type"], string> = {
  short_text:      "Texto curto",
  long_text:       "Texto longo",
  email:           "Email",
  number:          "Número",
  multiple_choice: "Múltipla escolha",
};

interface Props {
  field: FormField;
  index: number;
  total: number;
  onChange: (patch: Partial<FormField>) => void;
}

export function FieldConfig({ field, index, onChange }: Props) {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">
          Pergunta {index + 1} · {TYPE_LABELS[field.type]}
        </p>
        <h2 className="text-base font-semibold truncate">{field.label || "Sem título"}</h2>
      </div>

      {/* Configuração da pergunta */}
      <div className="border rounded-xl p-5 space-y-4 bg-card">
        <Input
          label="Pergunta *"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Ex: Qual é o seu nome?"
          maxLength={200}
        />

        {field.type !== "multiple_choice" && (
          <Input
            label="Placeholder"
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder="Texto de exemplo no campo"
            maxLength={100}
          />
        )}

        {/* Número: min/max */}
        {field.type === "number" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mínimo"
              type="number"
              value={field.min ?? ""}
              onChange={(e) =>
                onChange({ min: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="0"
            />
            <Input
              label="Máximo"
              type="number"
              value={field.max ?? ""}
              onChange={(e) =>
                onChange({ max: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="100"
            />
          </div>
        )}

        {/* Múltipla escolha: opções */}
        {field.type === "multiple_choice" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Opções</label>
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...(field.options ?? [])];
                    next[i] = e.target.value;
                    onChange({ options: next });
                  }}
                  className={cn(
                    "flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  placeholder={`Opção ${i + 1}`}
                />
                <button
                  onClick={() => {
                    const next = (field.options ?? []).filter((_, j) => j !== i);
                    onChange({ options: next });
                  }}
                  disabled={(field.options ?? []).length <= 1}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 text-sm transition-colors"
                  title="Remover opção"
                >✕</button>
              </div>
            ))}
            <button
              onClick={() =>
                onChange({ options: [...(field.options ?? []), `Opção ${(field.options?.length ?? 0) + 1}`] })
              }
              disabled={(field.options?.length ?? 0) >= 10}
              className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >
              + Adicionar opção
            </button>
          </div>
        )}

        {/* Obrigatório */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={field.required}
            onClick={() => onChange({ required: !field.required })}
            className={cn(
              "h-4 w-4 rounded border transition-colors cursor-pointer",
              field.required
                ? "bg-primary border-primary"
                : "bg-background border-input hover:border-primary"
            )}
          >
            {field.required && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
          <span className="text-sm">Campo obrigatório</span>
        </label>
      </div>

      {/* Preview da pergunta */}
      <div className="border rounded-xl p-5 bg-muted/30 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Preview
        </p>
        <p className="text-sm font-medium">
          {field.label || "Pergunta sem título"}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>

        {field.type === "short_text" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            {field.placeholder || "Sua resposta…"}
          </div>
        )}
        {field.type === "long_text" && (
          <div className="h-20 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            {field.placeholder || "Sua resposta…"}
          </div>
        )}
        {field.type === "email" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            {field.placeholder || "voce@exemplo.com"}
          </div>
        )}
        {field.type === "number" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            {field.placeholder || "0"}
          </div>
        )}
        {field.type === "multiple_choice" && (
          <div className="space-y-1.5">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border border-input bg-background shrink-0" />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
