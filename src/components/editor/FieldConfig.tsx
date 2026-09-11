"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormField, FieldCondition } from "@/types/database.types";

const TYPE_LABELS: Record<FormField["type"], string> = {
  short_text:      "Texto curto",
  long_text:       "Texto longo",
  email:           "Email",
  phone:           "Telefone",
  number:          "Número",
  date:            "Data",
  multiple_choice: "Múltipla escolha",
  yes_no:          "Sim / Não",
  rating:          "Avaliação (estrelas)",
  statement:       "Declaração",
};

// Tipos que não pedem placeholder
const NO_PLACEHOLDER = new Set(["multiple_choice", "yes_no", "rating", "statement", "date"]);
// Tipos sem campo obrigatório (statement não tem input)
const NO_REQUIRED = new Set(["statement"]);

interface Props {
  field: FormField;
  index: number;
  total: number;
  allFields: FormField[];
  onChange: (patch: Partial<FormField>) => void;
}

export function FieldConfig({ field, index, allFields, onChange }: Props) {
  const otherFields = allFields.filter(f => f.id !== field.id && f.type !== "statement");
  const conditions: FieldCondition[] = field.conditions ?? [];
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">
          {field.type === "statement" ? "Bloco de texto" : `Pergunta ${index + 1}`} · {TYPE_LABELS[field.type]}
        </p>
        <h2 className="text-base font-semibold truncate">{field.label || "Sem título"}</h2>
      </div>

      {/* Config */}
      <div className="border rounded-xl p-5 space-y-4 bg-card">
        <Input
          label={field.type === "statement" ? "Título" : "Pergunta *"}
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={field.type === "statement" ? "Ex: Antes de continuar…" : "Ex: Qual é o seu nome?"}
          maxLength={200}
        />

        {/* Descrição / Subtítulo (obrigatório em statement, opcional nos demais) */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {field.type === "statement" ? "Descrição *" : "Subtítulo"}
            {field.type !== "statement" && (
              <span className="ml-1 text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>opcional</span>
            )}
          </label>
          <textarea
            value={field.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value || undefined })}
            placeholder={field.type === "statement" ? "Texto exibido ao respondente…" : "Contexto adicional para o lead…"}
            rows={2}
            className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Placeholder */}
        {!NO_PLACEHOLDER.has(field.type) && (
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
            <Input label="Mínimo" type="number" value={field.min ?? ""}
              onChange={(e) => onChange({ min: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="0" />
            <Input label="Máximo" type="number" value={field.max ?? ""}
              onChange={(e) => onChange({ max: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="100" />
          </div>
        )}

        {/* Rating: escala */}
        {field.type === "rating" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Escala</label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => onChange({ scale: n })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                    (field.scale ?? 5) === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent border-input"
                  )}
                >
                  {n} ★
                </button>
              ))}
            </div>
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
                  className="flex-1 h-9 rounded-lg border border-input bg-background text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  placeholder={`Opção ${i + 1}`}
                />
                <button
                  onClick={() => onChange({ options: (field.options ?? []).filter((_, j) => j !== i) })}
                  disabled={(field.options ?? []).length <= 1}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 text-sm transition-colors"
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => onChange({ options: [...(field.options ?? []), `Opção ${(field.options?.length ?? 0) + 1}`] })}
              disabled={(field.options?.length ?? 0) >= 10}
              className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >+ Adicionar opção</button>
          </div>
        )}

        {/* Obrigatório */}
        {!NO_REQUIRED.has(field.type) && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              role="checkbox"
              aria-checked={field.required}
              onClick={() => onChange({ required: !field.required })}
              className={cn(
                "h-4 w-4 rounded border transition-colors cursor-pointer",
                field.required ? "bg-primary border-primary" : "bg-background border-input hover:border-primary"
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
        )}
      </div>

      {/* Preview */}
      <div className="border rounded-xl p-5 bg-muted/30 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
        <p className="text-sm font-medium">
          {field.label || "Pergunta sem título"}
          {!NO_REQUIRED.has(field.type) && field.required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}

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
        {field.type === "phone" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            {field.placeholder || "+55 (11) 9 0000-0000"}
          </div>
        )}
        {field.type === "number" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            {field.placeholder || "0"}
          </div>
        )}
        {field.type === "date" && (
          <div className="h-9 rounded-lg border bg-background px-3 flex items-center text-sm text-muted-foreground">
            dd/mm/aaaa
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
        {field.type === "yes_no" && (
          <div className="flex gap-2">
            {["Sim", "Não"].map(l => (
              <div key={l} className="flex-1 border rounded-lg px-4 py-2 text-sm text-center">{l}</div>
            ))}
          </div>
        )}
        {field.type === "rating" && (
          <div className="flex gap-1">
            {Array.from({ length: field.scale ?? 5 }, (_, i) => (
              <span key={i} className="text-2xl opacity-30">★</span>
            ))}
          </div>
        )}
      </div>

      {/* Qualificação MQL */}
      {field.type !== "statement" && (
        <div className="border rounded-xl p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualificação MQL</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {field.isMqlField
                  ? "Este campo define quem é MQL no pipeline"
                  : "Marcar como campo de faturamento do lead"}
              </p>
            </div>
            <button
              onClick={() => onChange(field.isMqlField ? { isMqlField: false } : { isMqlField: true })}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-medium transition-colors",
                field.isMqlField
                  ? "text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              style={field.isMqlField ? { background: "#7D83BD" } : {}}
            >
              {field.isMqlField ? "✓ Ativo" : "Ativar"}
            </button>
          </div>

          {field.isMqlField && (
            <div className="space-y-3 pt-1 border-t border-border">
              {/* Múltipla escolha: opções qualificadoras */}
              {field.type === "multiple_choice" && field.options && field.options.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Opções que qualificam como MQL</label>
                  {field.options.map(opt => {
                    const checked = (field.mqlQualifyingOptions ?? []).includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <div
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => {
                            const current = field.mqlQualifyingOptions ?? [];
                            onChange({ mqlQualifyingOptions: checked ? current.filter(o => o !== opt) : [...current, opt] });
                          }}
                          className="h-4 w-4 rounded border flex items-center justify-center shrink-0 cursor-pointer"
                          style={{
                            background: checked ? "#7D83BD" : "transparent",
                            borderColor: checked ? "#7D83BD" : "hsl(var(--border))",
                          }}
                        >
                          {checked && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
                              strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Yes/No: qual resposta qualifica */}
              {field.type === "yes_no" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Resposta que qualifica como MQL</label>
                  <div className="flex gap-2">
                    {[
                      { label: "Sim", value: true },
                      { label: "Não", value: false },
                    ].map(({ label, value }) => {
                      const active = (field.mqlYesQualifies ?? true) === value;
                      return (
                        <button key={label}
                          onClick={() => onChange({ mqlYesQualifies: value })}
                          className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                          style={{
                            background: active ? "rgba(125,131,189,0.15)" : "transparent",
                            borderColor: active ? "#7D83BD" : "hsl(var(--border))",
                            color: active ? "#CBCDE5" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Number/text: valor mínimo */}
              {field.type !== "multiple_choice" && field.type !== "yes_no" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Faturamento mínimo para MQL</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">R$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={field.mqlMinValue ?? 100000}
                      onChange={(e) => onChange({ mqlMinValue: Number(e.target.value) })}
                      className="flex-1 h-9 rounded-lg border border-input bg-background text-foreground px-3 text-sm focus-visible:outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { label: "50k", val: 50000 },
                      { label: "100k", val: 100000 },
                      { label: "500k", val: 500000 },
                      { label: "1M", val: 1000000 },
                    ].map(({ label, val }) => (
                      <button key={val}
                        onClick={() => onChange({ mqlMinValue: val })}
                        className="flex-1 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: (field.mqlMinValue ?? 100000) === val ? "rgba(125,131,189,0.2)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${(field.mqlMinValue ?? 100000) === val ? "rgba(125,131,189,0.4)" : "rgba(255,255,255,0.08)"}`,
                          color: (field.mqlMinValue ?? 100000) === val ? "#CBCDE5" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lógica condicional */}
      {field.type !== "statement" && (
        <div className="border rounded-xl p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lógica condicional</p>
            <button
              onClick={() => onChange({ conditions: [...conditions, { fieldId: field.id, operator: "equals", value: "", jumpTo: "" }] })}
              className="text-xs text-primary hover:underline"
            >+ Adicionar regra</button>
          </div>

          {conditions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma regra. O formulário segue a ordem padrão.
            </p>
          )}

          {conditions.map((cond, i) => {
            // Qual campo esta condição observa
            const watchedField = cond.fieldId === field.id ? field : allFields.find(f => f.id === cond.fieldId);
            const isMC = watchedField?.type === "multiple_choice";
            const isYesNo = watchedField?.type === "yes_no";
            const hasChips = isMC || isYesNo;
            // chipOptions: label exibida + val armazenado (deve casar com o que FormPlayer salva)
            // val sempre trimado para evitar mismatch com espaços acidentais
            const chipOptions: { label: string; val: string }[] = isMC
              ? (watchedField?.options ?? []).map(o => ({ label: o, val: o.trim() }))
              : isYesNo
              ? [{ label: "Sim", val: "sim" }, { label: "Não", val: "nao" }]
              : [];
            // valores selecionados (comma-separated) — sempre trim ao ler
            const selectedVals = cond.value ? cond.value.split(",").map(v => v.trim()).filter(Boolean) : [];

            const toggleChip = (chipVal: string) => {
              const trimmed = chipVal.trim();
              const next = [...conditions];
              const already = selectedVals.includes(trimmed);
              const newVals = already ? selectedVals.filter(v => v !== trimmed) : [...selectedVals, trimmed];
              next[i] = { ...next[i], value: newVals.join(",") };
              onChange({ conditions: next });
            };

            return (
              <div key={i} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                {/* Se [campo] */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground shrink-0">Se</span>
                  <select
                    value={cond.fieldId}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[i] = { ...next[i], fieldId: e.target.value, value: "" };
                      onChange({ conditions: next });
                    }}
                    className="flex-1 h-7 rounded border border-input bg-background text-foreground px-2 text-xs"
                  >
                    <option value={field.id}>esta resposta</option>
                    {otherFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>

                {/* Operador + valor */}
                <div className="flex items-start gap-1 text-xs">
                  {!hasChips && (
                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...next[i], operator: e.target.value as FieldCondition["operator"] };
                        onChange({ conditions: next });
                      }}
                      className="h-7 rounded border border-input bg-background text-foreground px-2 text-xs shrink-0"
                    >
                      <option value="equals">for igual a</option>
                      <option value="not_equals">for diferente de</option>
                      <option value="contains">contiver</option>
                    </select>
                  )}
                  {hasChips ? (
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1.5">for uma das opções:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {chipOptions.map(({ label, val }) => {
                          const active = selectedVals.includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleChip(val); }}
                              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                              style={{
                                background: active ? "rgba(125,131,189,0.25)" : "rgba(255,255,255,0.05)",
                                border: `1px solid ${active ? "rgba(125,131,189,0.5)" : "rgba(255,255,255,0.1)"}`,
                                color: active ? "#CBCDE5" : "rgba(255,255,255,0.45)",
                                cursor: "pointer",
                              }}
                            >
                              {active ? "✓ " : ""}{label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[i] = { ...next[i], value: e.target.value };
                        onChange({ conditions: next });
                      }}
                      placeholder="valor"
                      className="flex-1 h-7 rounded border border-input bg-background text-foreground px-2 text-xs"
                    />
                  )}
                </div>

                {/* Destino */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground shrink-0">→ ir para</span>
                  <select
                    value={cond.jumpTo}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[i] = { ...next[i], jumpTo: e.target.value };
                      onChange({ conditions: next });
                    }}
                    className="flex-1 h-7 rounded border border-input bg-background text-foreground px-2 text-xs"
                  >
                    <option value="">Selecionar destino</option>
                    <option value="submit">✓ Finalizar formulário</option>
                    <option value="disqualify">✕ Desqualificar lead</option>
                    {allFields.filter(f => f.id !== field.id && f.type !== "statement").map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onChange({ conditions: conditions.filter((_, j) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive text-xs px-1"
                  >✕</button>
                </div>

                {/* Desqualificação: mensagem + URL */}
                {cond.jumpTo === "disqualify" && (
                  <div className="space-y-2 pt-1 pl-1 border-l-2 border-red-500/30">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Mensagem exibida ao lead</p>
                      <textarea
                        value={cond.disqualifyMessage ?? ""}
                        onChange={(e) => {
                          const next = [...conditions];
                          next[i] = { ...next[i], disqualifyMessage: e.target.value || undefined };
                          onChange({ conditions: next });
                        }}
                        placeholder="Ex: Obrigado pelo interesse. No momento, nossos serviços são voltados para empresas com faturamento acima de R$ 100k/mês."
                        rows={2}
                        className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-xs resize-none focus-visible:outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Ou redirecionar para (URL)</p>
                      <input
                        type="url"
                        value={cond.disqualifyUrl ?? ""}
                        onChange={(e) => {
                          const next = [...conditions];
                          next[i] = { ...next[i], disqualifyUrl: e.target.value || undefined };
                          onChange({ conditions: next });
                        }}
                        placeholder="https://seusite.com/obrigado"
                        className="w-full h-7 rounded border border-input bg-background text-foreground px-2 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
