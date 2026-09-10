"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { saveForm, togglePublish, deleteForm } from "@/app/actions/forms";
import { generateFieldId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldList } from "./FieldList";
import { FieldConfig } from "./FieldConfig";
import { SettingsPanel } from "./SettingsPanel";
import type { Form, FormField, FormSettings, FieldType } from "@/types/database.types";

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_FIELD = (type: FieldType): FormField => ({
  id: generateFieldId(),
  type,
  label: FIELD_LABELS[type],
  required: false,
  placeholder: "",
  options: type === "multiple_choice" ? ["Opção 1", "Opção 2"] : undefined,
});

const FIELD_LABELS: Record<FieldType, string> = {
  short_text: "Pergunta de texto",
  long_text: "Texto longo",
  email: "Endereço de email",
  number: "Número",
  multiple_choice: "Múltipla escolha",
};

type Tab = "fields" | "settings";

interface Props {
  form: Form;
}

export function FormEditor({ form }: Props) {
  const [title, setTitle] = useState(form.title);
  const [fields, setFields] = useState<FormField[]>(form.fields);
  const [settings, setSettings] = useState<FormSettings>(form.settings);
  const updateSettings = useCallback((patch: Partial<FormSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(
    form.fields[0]?.id ?? null
  );
  const [tab, setTab] = useState<Tab>("fields");
  const [isPublished, setIsPublished] = useState(form.is_published);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await saveForm(form.id, { title, fields, settings });
      setSaveStatus(result.error ? "error" : "saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    });
  }, [form.id, title, fields, settings]);

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
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }, []);

  const removeField = useCallback(
    (id: string) => {
      setFields((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [selectedId]
  );

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

  // ─── Render ────────────────────────────────────────────────────────────────
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/f/${form.slug}`
      : `/f/${form.slug}`;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="border-b bg-background/95 backdrop-blur z-30 shrink-0">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* Back */}
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Voltar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="h-4 w-4">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>

          {/* Title inline edit */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0 text-sm font-medium bg-transparent border-0 outline-none focus:ring-0 truncate"
            placeholder="Nome do formulário"
            maxLength={100}
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Save status */}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600">✓ Salvo</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-destructive">Erro ao salvar</span>
            )}

            {/* Share link (só se publicado) */}
            {isPublished && (
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors"
                title="Copiar link"
              >
                Copiar link
              </button>
            )}

            {/* Preview */}
            {isPublished && (
              <Link
                href={`/f/${form.slug}`}
                target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors"
              >
                Preview ↗
              </Link>
            )}

            {/* Publish toggle */}
            <button
              onClick={handleTogglePublish}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isPublished
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              } disabled:opacity-50`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-zinc-400"}`} />
              {isPublished ? "Publicado" : "Rascunho"}
            </button>

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={isPending}
              loading={saveStatus === "saving"}
              size="sm"
            >
              Salvar
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-72 border-r flex flex-col overflow-hidden shrink-0">
          {/* Tab switcher */}
          <div className="flex border-b shrink-0">
            {(["fields", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "fields" ? "Perguntas" : "Configurações"}
              </button>
            ))}
          </div>

          {tab === "fields" ? (
            <FieldList
              fields={fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={addField}
              onRemove={removeField}
              onMove={moveField}
            />
          ) : (
            <SettingsPanel settings={settings} onChange={updateSettings} />
          )}
        </aside>

        {/* ── Main: field config or empty state ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === "fields" && selectedField ? (
            <FieldConfig
              field={selectedField}
              index={fields.findIndex((f) => f.id === selectedField.id)}
              total={fields.length}
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
      </div>
    </div>
  );
}
