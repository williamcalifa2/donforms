"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormSettings } from "@/types/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserForm {
  id: string;
  title: string;
  settings: FormSettings;
  is_published: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  color: string;
  urlLabel: string;
  urlPlaceholder: string;
  steps: string[];
  docs?: string;
}

// ─── Integrations catalog ─────────────────────────────────────────────────────
const INTEGRATIONS: Integration[] = [
  {
    id: "make",
    name: "Make.com",
    emoji: "⚙️",
    category: "Automação",
    color: "#6c1fc8",
    description: "Automatize fluxos completos: CRM, planilhas, notificações.",
    urlLabel: "Webhook URL do Make.com",
    urlPlaceholder: "https://hook.eu2.make.com/...",
    steps: [
      'Crie um cenário → módulo "Webhooks" → "Custom webhook"',
      "Copie a URL gerada pelo Make e cole abaixo",
      "Adicione os módulos seguintes (Google Sheets, HubSpot, etc.)",
      "Publique o cenário e salve a integração",
    ],
    docs: "https://www.make.com/en/help/tools/webhooks",
  },
  {
    id: "zapier",
    name: "Zapier",
    emoji: "⚡",
    category: "Automação",
    color: "#ff4a00",
    description: "Conecte com mais de 5.000 aplicativos sem código.",
    urlLabel: "Webhook URL do Zapier",
    urlPlaceholder: "https://hooks.zapier.com/hooks/catch/...",
    steps: [
      'Crie um Zap → trigger "Webhooks by Zapier" → "Catch Hook"',
      "Copie a URL do webhook e cole abaixo",
      "Teste o trigger com uma resposta de exemplo",
      "Configure as ações e publique o Zap",
    ],
    docs: "https://zapier.com/apps/webhook/integrations",
  },
  {
    id: "n8n",
    name: "n8n",
    emoji: "🔄",
    category: "Automação",
    color: "#ea4b71",
    description: "Automação open-source. Self-hosted ou cloud.",
    urlLabel: "Webhook URL do n8n",
    urlPlaceholder: "https://n8n.example.com/webhook/...",
    steps: [
      'Crie um workflow → nó "Webhook"',
      "Copie a URL gerada e cole abaixo",
      "Salve e ative o workflow",
      "Adicione nós para processar os dados",
    ],
    docs: "https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.webhook/",
  },
  {
    id: "rdstation",
    name: "RD Station",
    emoji: "🎯",
    category: "CRM / Marketing",
    color: "#00b8d9",
    description: "Envie leads direto para o RD Station Marketing.",
    urlLabel: "Webhook URL (via Make.com/n8n)",
    urlPlaceholder: "https://hook.eu2.make.com/... (cenário RD Station)",
    steps: [
      "Crie um cenário no Make.com com webhook como trigger",
      "Adicione o módulo HTTP para chamar a API do RD Station",
      "Mapeie: email → email, nome → name, conversion_identifier → nome do formulário",
      "Copie a URL do webhook do Make e cole abaixo",
    ],
    docs: "https://developers.rdstation.com/reference/conversions",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    emoji: "🧡",
    category: "CRM / Marketing",
    color: "#ff7a59",
    description: "Crie contatos e negócios no HubSpot automaticamente.",
    urlLabel: "Webhook URL (via Make.com)",
    urlPlaceholder: "https://hook.eu2.make.com/... (cenário HubSpot)",
    steps: [
      "No Make.com, crie cenário com webhook como trigger",
      'Adicione "HubSpot CRM" → "Create/Update a Contact"',
      "Mapeie email e nome do formulário",
      "Copie a URL e cole abaixo",
    ],
    docs: "https://developers.hubspot.com/docs/api/crm/contacts",
  },
  {
    id: "clint",
    name: "Clint",
    emoji: "💼",
    category: "CRM",
    color: "#4f46e5",
    description: "CRM brasileiro. Leads qualificados direto no pipeline.",
    urlLabel: "Webhook URL (via Make.com)",
    urlPlaceholder: "https://hook.eu2.make.com/... (cenário Clint)",
    steps: [
      "No Clint, vá em Configurações → API e copie sua chave",
      "No Make.com, receba o webhook e chame POST /leads da API Clint",
      "Mapeie name, email, phone",
      "Copie a URL do webhook Make e cole abaixo",
    ],
    docs: "https://developers.clint.com.br",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    emoji: "🔵",
    category: "CRM",
    color: "#2e5b4f",
    description: "Crie pessoas e negócios no Pipedrive automaticamente.",
    urlLabel: "Webhook URL (via Make.com)",
    urlPlaceholder: "https://hook.eu2.make.com/... (cenário Pipedrive)",
    steps: [
      "No Make.com, crie cenário com webhook como trigger",
      'Adicione "Pipedrive" → "Create a Person"',
      "Mapeie nome e email, adicione Create a Deal",
      "Copie a URL e cole abaixo",
    ],
    docs: "https://developers.pipedrive.com/docs/api/v1",
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    emoji: "📊",
    category: "Planilhas",
    color: "#0f9d58",
    description: "Cada resposta vira uma linha na planilha em tempo real.",
    urlLabel: "Webhook URL (via Make.com)",
    urlPlaceholder: "https://hook.eu2.make.com/... (cenário Google Sheets)",
    steps: [
      "No Make.com, crie cenário com webhook como trigger",
      'Adicione "Google Sheets" → "Add a Row"',
      "Mapeie as colunas para os campos do formulário",
      "Copie a URL e cole abaixo",
    ],
    docs: "https://www.make.com/en/help/app/google-sheets",
  },
  {
    id: "slack",
    name: "Slack",
    emoji: "💬",
    category: "Notificações",
    color: "#4a154b",
    description: "Receba uma mensagem no Slack a cada nova resposta.",
    urlLabel: "Incoming Webhook URL do Slack",
    urlPlaceholder: "https://hooks.slack.com/services/...",
    steps: [
      'No Slack: Apps → Incoming Webhooks → "Add to Slack"',
      "Escolha o canal e copie a URL gerada",
      "Cole a URL abaixo e salve — pronto!",
    ],
    docs: "https://api.slack.com/messaging/webhooks",
  },
];

const CATEGORIES = ["Automação", "CRM / Marketing", "CRM", "Planilhas", "Notificações"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [forms, setForms] = useState<UserForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [loadingForms, setLoadingForms] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load forms
  useEffect(() => {
    setLoadingForms(true);
    fetch("/api/user/forms")
      .then((r) => r.json())
      .then((d) => {
        setForms(d.forms ?? []);
        if (d.forms?.length > 0) setSelectedFormId(d.forms[0].id);
      })
      .finally(() => setLoadingForms(false));
  }, []);

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  const onUpdate = useCallback((updatedForm: UserForm) => {
    setForms((prev) => prev.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
  }, []);

  const grouped = CATEGORIES.map((cat) => ({
    label: cat,
    items: INTEGRATIONS.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
            Integrações
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
            Selecione o formulário e conecte suas ferramentas
          </p>
        </div>

        {/* Form selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Formulário:</span>
          {loadingForms ? (
            <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
          ) : (
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              {forms.length === 0 && (
                <option value="">Nenhum formulário</option>
              )}
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl px-5 py-4 space-y-2"
        style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.18)" }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 16 }}>⚡</span>
          <p className="text-sm font-semibold" style={{ color: "#a5a0ff" }}>Como funciona</p>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          Selecione o formulário acima, clique em <strong style={{ color: "rgba(255,255,255,0.75)" }}>Conectar</strong> na integração desejada, cole a URL do webhook e salve.
          A partir daí, cada nova resposta dispara automaticamente para a ferramenta configurada.
        </p>
      </div>

      {/* Integration cards */}
      {!selectedForm && !loadingForms ? (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <p className="text-sm">Crie um formulário primeiro para configurar integrações.</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((integ) => (
                <IntegrationCard
                  key={integ.id}
                  integration={integ}
                  form={selectedForm}
                  expanded={expandedId === integ.id}
                  onToggle={() => setExpandedId((id) => (id === integ.id ? null : integ.id))}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Footer */}
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Qualquer ferramenta com suporte a HTTP POST funciona.{" "}
          <span style={{ color: "rgba(255,255,255,0.55)" }}>
            Configure mais webhooks diretamente em Editor → Configurações.
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────
function IntegrationCard({
  integration: integ,
  form,
  expanded,
  onToggle,
  onUpdate,
}: {
  integration: Integration;
  form: UserForm | undefined;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (form: UserForm) => void;
}) {
  const cfg = form?.settings?.integrations?.[integ.id];
  const isConnected = !!(cfg?.enabled && cfg?.webhookUrl);

  const [urlInput, setUrlInput] = useState(cfg?.webhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Sync input when form changes
  useEffect(() => {
    setUrlInput(form?.settings?.integrations?.[integ.id]?.webhookUrl ?? "");
    setTestResult(null);
    setSaveMsg(null);
  }, [form?.id, integ.id]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const currentIntegrations = form.settings.integrations ?? {};
      const newIntegrations = {
        ...currentIntegrations,
        [integ.id]: {
          webhookUrl: urlInput.trim(),
          enabled: urlInput.trim().length > 0,
          connectedAt: new Date().toISOString(),
        },
      };
      const res = await fetch(`/api/forms/${form.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingsPatch: { integrations: newIntegrations } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      onUpdate({ ...form, settings: data.settings });
      setSaveMsg("Salvo ✓");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!form) return;
    setSaving(true);
    try {
      const currentIntegrations = form.settings.integrations ?? {};
      const newIntegrations = {
        ...currentIntegrations,
        [integ.id]: { webhookUrl: "", enabled: false },
      };
      const res = await fetch(`/api/forms/${form.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingsPatch: { integrations: newIntegrations } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao desconectar");
      onUpdate({ ...form, settings: data.settings });
      setUrlInput("");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!form || !urlInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/forms/${form.id}/webhook-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: `HTTP ${data.statusCode} em ${data.durationMs}ms` });
      } else {
        setTestResult({ ok: false, msg: data.errorMsg ?? `HTTP ${data.statusCode}` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${isConnected ? integ.color + "50" : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.2s",
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: `${integ.color}20`, border: `1px solid ${integ.color}30` }}
        >
          {integ.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
              {integ.name}
            </p>
            {isConnected && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: integ.color + "25", color: integ.color }}
              >
                conectado
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
            {integ.description}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={!form}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background: isConnected ? "rgba(255,255,255,0.06)" : `${integ.color}20`,
            color: isConnected ? "rgba(255,255,255,0.55)" : integ.color,
            border: `1px solid ${isConnected ? "rgba(255,255,255,0.08)" : integ.color + "40"}`,
            cursor: form ? "pointer" : "not-allowed",
            opacity: form ? 1 : 0.4,
          }}
        >
          {expanded ? "Fechar" : isConnected ? "Editar" : "Conectar"}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="border-t px-4 pb-4 pt-3 space-y-4"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {/* Steps */}
          <ol className="space-y-1.5">
            {integ.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                <span
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: `${integ.color}25`, color: integ.color }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          {integ.docs && (
            <a
              href={integ.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium"
              style={{ color: integ.color }}
            >
              Documentação oficial →
            </a>
          )}

          {/* URL input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              {integ.urlLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={integ.urlPlaceholder}
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={handleTest}
                disabled={!urlInput.trim() || testing}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.55)",
                  cursor: urlInput.trim() && !testing ? "pointer" : "not-allowed",
                  opacity: urlInput.trim() && !testing ? 1 : 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                {testing ? "..." : "Testar"}
              </button>
            </div>
            {testResult && (
              <p className="text-[11px]" style={{ color: testResult.ok ? "#4ade80" : "#f87171" }}>
                {testResult.ok ? "✓" : "✗"} {testResult.msg}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !urlInput.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: urlInput.trim() ? integ.color : "rgba(255,255,255,0.06)",
                color: urlInput.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                cursor: !saving && urlInput.trim() ? "pointer" : "not-allowed",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Salvando..." : "Salvar integração"}
            </button>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  cursor: "pointer",
                }}
              >
                Desconectar
              </button>
            )}
            {saveMsg && (
              <span className="text-[11px]" style={{ color: saveMsg === "Salvo ✓" ? "#4ade80" : "#f87171" }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
