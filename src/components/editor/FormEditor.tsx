"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { saveForm, togglePublish, deleteForm } from "@/app/actions/forms";
import { FormHistoryPanel } from "./FormHistoryPanel";
import { FlowView } from "./FlowView";
import { generateFieldId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldList } from "./FieldList";
import { FieldConfig } from "./FieldConfig";
import { SettingsPanel } from "./SettingsPanel";
import { ShareModal } from "./ShareModal";
import type { Form, FormField, FormSettings, FieldType } from "@/types/database.types";

// ─── Defaults ─────────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<FieldType, string> = {
  short_text:      "Pergunta de texto",
  long_text:       "Texto longo",
  email:           "Endereço de email",
  phone:           "Telefone",
  number:          "Número",
  date:            "Data",
  multiple_choice: "Múltipla escolha",
  yes_no:          "Sim ou não?",
  rating:          "Como você avalia?",
  statement:       "Texto de apresentação",
};

const DEFAULT_FIELD = (type: FieldType): FormField => ({
  id: generateFieldId(),
  type,
  label: FIELD_LABELS[type],
  required: type !== "statement",
  placeholder: "",
  options: type === "multiple_choice" ? ["Opção 1", "Opção 2", "Opção 3"] : undefined,
  scale: type === "rating" ? 5 : undefined,
});

type Tab = "fields" | "settings";
type FieldsView = "list" | "flow";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  form: Form;
  appUrl: string;
}

export function FormEditor({ form, appUrl }: Props) {
  const [title, setTitle] = useState(form.title);
  const [fields, setFields] = useState<FormField[]>(form.fields);
  const [settings, setSettings] = useState<FormSettings>(form.settings);
  const updateSettings = useCallback((patch: Partial<FormSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(form.fields[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("fields");
  const [fieldsView, setFieldsView] = useState<FieldsView>("list");
  const [isPublished, setIsPublished] = useState(form.is_published);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isPending, startTransition] = useTransition();

  const [linkCopied, setLinkCopied] = useState(false);
  const selectedField = fields.find((f) => f.id === selectedId) ?? null;
  const shareUrl = `${appUrl}/f/${form.slug}`;

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // ─── Auto-save debounce ────────────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title, fields, settings });

  const triggerSave = useCallback((t: string, f: FormField[], s: FormSettings) => {
    setSaveStatus("saving");
    const prev = { title: lastSaved.current.title, fields: lastSaved.current.fields };
    startTransition(async () => {
      const result = await saveForm(form.id, { title: t, fields: f, settings: s }, prev);
      setSaveStatus(result.error ? "error" : "saved");
      if (!result.error) lastSaved.current = { title: t, fields: f, settings: s };
      setTimeout(() => setSaveStatus("idle"), 2000);
    });
  }, [form.id]);

  useEffect(() => {
    // Skip initial render
    const isDirty =
      title !== lastSaved.current.title ||
      JSON.stringify(fields) !== JSON.stringify(lastSaved.current.fields) ||
      JSON.stringify(settings) !== JSON.stringify(lastSaved.current.settings);

    if (!isDirty) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => triggerSave(title, fields, settings), 1500);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, fields, settings, triggerSave]);

  // ─── Manual save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    triggerSave(title, fields, settings);
  }, [title, fields, settings, triggerSave]);

  // ─── Publish toggle ────────────────────────────────────────────────────────
  const handleTogglePublish = useCallback(() => {
    startTransition(async () => {
      const next = !isPublished;
      const result = await togglePublish(form.id, next);
      if (!result.error) setIsPublished(next);
    });
  }, [form.id, isPublished]);

  // ─── Field CRUD ────────────────────────────────────────────────────────────
  const addField = useCallback((type: FieldType) => {
    const newField = DEFAULT_FIELD(type);
    setFields((prev) => [...prev, newField]);
    setSelectedId(newField.id);
    setTab("fields");
  }, []);

  const updateField = useCallback((id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => {
      if (f.id === id) return { ...f, ...patch };
      // Se ativando isMqlField neste campo, limpar dos outros
      if (patch.isMqlField === true) return { ...f, isMqlField: false };
      return f;
    }));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  const moveField = useCallback((id: string, direction: "up" | "down") => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  const reorderField = useCallback((fromIdx: number, toIdx: number) => {
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="border-b bg-background/95 backdrop-blur z-30 shrink-0">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Voltar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="h-4 w-4">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0 text-sm font-medium bg-transparent border-0 outline-none focus:ring-0 truncate text-foreground placeholder:text-muted-foreground"
            placeholder="Nome do formulário"
            maxLength={100}
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-save status */}
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando…
              </span>
            )}
            {saveStatus === "saved" && <span className="text-xs text-green-400">✓ Salvo</span>}
            {saveStatus === "error" && <span className="text-xs text-destructive">Erro ao salvar</span>}

            {/* Link chip clicável */}
            <button
              onClick={copyShareUrl}
              className="hidden sm:flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1 transition-all font-mono max-w-[200px]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: linkCopied ? "#4ade80" : "rgba(255,255,255,0.4)",
              }}
              title="Clique para copiar"
            >
              {linkCopied ? (
                <span>✓ Copiado</span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  <span className="truncate">{shareUrl.replace(/^https?:\/\//, "")}</span>
                </>
              )}
            </button>

            {/* Preview (always visible) */}
            <Link
              href={`/dashboard/forms/${form.id}/preview`}
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="h-3 w-3">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </Link>

            {/* Share modal */}
            <ShareModal slug={form.slug} appUrl={appUrl} isPublished={isPublished} />

            {/* Publish toggle */}
            <button
              onClick={handleTogglePublish}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={isPublished
                ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
                : { background: "rgba(239,241,245,0.07)", color: "rgba(239,241,245,0.5)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full"
                style={{ background: isPublished ? "#4ade80" : "rgba(255,255,255,0.3)" }} />
              {isPublished ? "Publicado" : "Rascunho"}
            </button>

            {/* Manual save */}
            <Button onClick={handleSave} disabled={isPending || saveStatus === "saving"} size="sm">
              Salvar
            </Button>

            {/* Delete */}
            <button
              onClick={() => {
                if (confirm("Excluir este formulário? Esta ação não pode ser desfeita.")) {
                  startTransition(() => deleteForm(form.id));
                }
              }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
              title="Excluir formulário"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="h-3.5 w-3.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>

            {/* Histórico — último ícone, discreto */}
            <FormHistoryPanel formId={form.id} />
          </div>
        </div>

      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-72 flex flex-col overflow-hidden shrink-0"
          style={{ borderRight: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex shrink-0 flex-col" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
            <div className="flex">
              {(["fields", "settings"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "fields" ? "Perguntas" : "Configurações"}
                </button>
              ))}
            </div>
            {/* View toggle — only on fields tab */}
            {tab === "fields" && (
              <div className="flex items-center gap-1 px-2 py-1.5">
                {(["list", "flow"] as FieldsView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setFieldsView(v)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all flex-1 justify-center"
                    style={{
                      background: fieldsView === v ? "rgba(125,131,189,0.15)" : "transparent",
                      color: fieldsView === v ? "#7D83BD" : "rgba(255,255,255,0.3)",
                      border: fieldsView === v ? "1px solid rgba(125,131,189,0.2)" : "1px solid transparent",
                    }}
                  >
                    {v === "list" ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                          <line x1="8" y1="18" x2="21" y2="18"/>
                          <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                          <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                          <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
                        </svg>
                        Lista
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="8" height="6" rx="1.5"/>
                          <rect x="13" y="15" width="8" height="6" rx="1.5"/>
                          <path d="M7 9v3M7 12h10M17 12v3"/>
                        </svg>
                        Fluxo
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === "fields" ? (
            <FieldList
              fields={fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={addField}
              onRemove={removeField}
              onMove={moveField}
              onReorder={reorderField}
            />
          ) : (
            <SettingsPanel settings={settings} onChange={updateSettings} formUrl={`${appUrl}/f/${form.slug}`} fields={fields} />
          )}
        </aside>

        {/* Main */}
        {tab === "fields" && fieldsView === "flow" ? (
          // ── Flow view — full height, no padding ──
          <div className="flex-1 relative overflow-hidden">
            <FlowView
              fields={fields}
              selectedId={selectedId}
              onSelectField={(id) => {
                setSelectedId(id);
                setFieldsView("list");
              }}
            />
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-6">
            {tab === "fields" && selectedField ? (
              <FieldConfig
                field={selectedField}
                index={fields.findIndex((f) => f.id === selectedField.id)}
                total={fields.length}
                allFields={fields}
                onChange={(patch) => updateField(selectedField.id, patch)}
              />
            ) : tab === "fields" && fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="h-10 w-10 opacity-30">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h6M9 12h6M9 15h4" />
                </svg>
                <p className="text-sm">Adicione perguntas no painel esquerdo</p>
              </div>
            ) : tab === "settings" ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
                <p className="text-sm">Configure as opções no painel esquerdo</p>
              </div>
            ) : null}
          </main>
        )}
      </div>
    </div>
  );
}
