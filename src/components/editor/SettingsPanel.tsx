"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { FormField, FormSettings } from "@/types/database.types";

const PRESET_COLORS = [
  "#7D83BD", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#0ea5e9", "#64748b", "#18181b",
];

const DON_THEME = { primaryColor: "#7D83BD", bgColor: "#000000" };

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const CHANNEL_PRESETS = [
  { label: "Facebook Ads", source: "facebook", medium: "paid_social", campaign: "" },
  { label: "Instagram Ads", source: "instagram", medium: "paid_social", campaign: "" },
  { label: "Google Ads", source: "google", medium: "cpc", campaign: "" },
  { label: "TikTok Ads", source: "tiktok", medium: "paid_social", campaign: "" },
  { label: "WhatsApp", source: "whatsapp", medium: "social", campaign: "" },
  { label: "Email", source: "email", medium: "newsletter", campaign: "" },
];

interface Props {
  settings: FormSettings;
  onChange: (patch: Partial<FormSettings>) => void;
  formUrl: string;
  fields?: FormField[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, onChange, formUrl, fields = [] }: Props) {
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    const url = new URL(formUrl);
    if (utmSource) url.searchParams.set("utm_source", utmSource);
    if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
    if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
    if (utmContent) url.searchParams.set("utm_content", utmContent);
    if (utmTerm) url.searchParams.set("utm_term", utmTerm);
    return url.toString();
  };

  const generatedUrl = buildUrl();
  const hasUtm = utmSource || utmMedium || utmCampaign || utmContent || utmTerm;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const applyPreset = (preset: typeof CHANNEL_PRESETS[0]) => {
    setUtmSource(preset.source);
    setUtmMedium(preset.medium);
    setUtmCampaign(preset.campaign);
    setUtmContent("");
    setUtmTerm("");
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">

      {/* ── UTM Builder ───────────────────────────────────────── */}
      <Section title="UTM Builder">
        {/* Presets de canal */}
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-[10px] px-2 py-1 rounded-md transition-colors"
              style={{
                background: utmSource === p.source && utmMedium === p.medium
                  ? "rgba(123,123,255,0.18)"
                  : "rgba(255,255,255,0.06)",
                color: utmSource === p.source && utmMedium === p.medium
                  ? "hsl(238 100% 74%)"
                  : "rgba(255,255,255,0.55)",
                border: `1px solid ${utmSource === p.source && utmMedium === p.medium ? "hsl(238 100% 74% / 0.4)" : "transparent"}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Campos UTM */}
        <div className="space-y-2">
          {[
            { key: "utm_source", val: utmSource, set: (v: string) => setUtmSource(v.replace(/ /g, "_")), ph: "facebook, google, email…" },
            { key: "utm_medium", val: utmMedium, set: (v: string) => setUtmMedium(v.replace(/ /g, "_")), ph: "cpc, paid_social, email…" },
            { key: "utm_campaign", val: utmCampaign, set: (v: string) => setUtmCampaign(v.replace(/ /g, "_")), ph: "nome-da-campanha" },
            { key: "utm_content", val: utmContent, set: (v: string) => setUtmContent(v.replace(/ /g, "_")), ph: "variacao-criativo" },
            { key: "utm_term", val: utmTerm, set: (v: string) => setUtmTerm(v.replace(/ /g, "_")), ph: "palavra-chave" },
          ].map(({ key, val, set, ph }) => (
            <div key={key} className="space-y-0.5">
              <span
                className="block text-[9px] font-mono tracking-wider"
                style={{ color: val ? "hsl(238 100% 74% / 0.8)" : "rgba(255,255,255,0.3)" }}
              >
                {key}
              </span>
              <input
                type="text"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                className="w-full h-7 rounded-md border bg-background text-foreground text-xs px-2 placeholder:text-muted-foreground focus-visible:outline-none transition-colors"
                style={{
                  borderColor: val ? "hsl(238 100% 74% / 0.3)" : "hsl(var(--border))",
                  outline: "none",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(238 100% 74% / 0.6)")}
                onBlur={e => (e.currentTarget.style.borderColor = val ? "hsl(238 100% 74% / 0.3)" : "hsl(var(--border))")}
              />
            </div>
          ))}
        </div>

        {/* URL gerada */}
        <div className="space-y-1.5">
          <div
            className="w-full text-[10px] font-mono px-2 py-2 rounded-lg break-all leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: hasUtm ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
            }}
          >
            {generatedUrl}
          </div>
          <button
            onClick={handleCopy}
            disabled={!hasUtm}
            className="w-full h-8 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
            style={{ background: copied ? "rgba(34,197,94,0.15)" : "rgba(123,123,255,0.15)", color: copied ? "#4ade80" : "hsl(238 100% 74%)" }}
          >
            {copied ? "✓ Copiado!" : "Copiar link com UTM"}
          </button>
        </div>
      </Section>


      {/* ── Aparência ─────────────────────────────────────────── */}
      <Section title="Aparência">
        {/* Botão tema Don */}
        <button
          onClick={() => onChange(DON_THEME)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: "rgba(125,131,189,0.12)",
            border: "1px solid rgba(125,131,189,0.3)",
            color: "#CBCDE5",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(125,131,189,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(125,131,189,0.12)"; }}
        >
          <span style={{ fontSize: "14px" }}>✦</span>
          Aplicar tema Don (padrão)
        </button>

        <div className="space-y-2">
          <label className="text-xs font-medium">Cor primária</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button key={color} onClick={() => onChange({ primaryColor: color })} title={color}
                className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: settings.primaryColor === color ? color : "transparent",
                  outline: settings.primaryColor === color ? `2px solid ${color}` : "none",
                  outlineOffset: "2px",
                }} />
            ))}
            <div className="relative h-7 w-7">
              <input type="color" value={settings.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="Cor personalizada" />
              <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center text-[10px] text-muted-foreground"
                style={{ backgroundColor: settings.primaryColor }}>+</div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Cor de fundo</label>
          <div className="flex items-center gap-2">
            <input type="color" value={settings.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-9 w-16 rounded-lg border border-input cursor-pointer p-0.5" />
            <Input value={settings.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              placeholder="#ffffff" className="font-mono text-xs" />
          </div>
        </div>

        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: settings.bgColor }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "#1a1a1a" }}>Preview</p>
          <button className="px-4 py-2 rounded-lg text-white text-xs font-medium"
            style={{ backgroundColor: settings.primaryColor }}>Próximo →</button>
        </div>
      </Section>

      {/* ── Mensagem final ────────────────────────────────────── */}
      <Section title="Conclusão">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Mensagem de confirmação</label>
          <textarea value={settings.thankYouMessage}
            onChange={(e) => onChange({ thankYouMessage: e.target.value })}
            rows={3} maxLength={300}
            placeholder="Obrigado! Suas respostas foram enviadas."
            className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-right">{settings.thankYouMessage.length}/300</p>
        </div>
        <Input label="Redirecionar após envio (opcional)"
          value={settings.redirectUrl ?? ""}
          onChange={(e) => onChange({ redirectUrl: e.target.value || null })}
          placeholder="https://seusite.com/obrigado" type="url" />
      </Section>

      {/* ── Pixel & Tags ──────────────────────────────────────── */}
      <Section title="Pixel & Rastreamento">
        <Input
          label="Meta Pixel ID"
          value={settings.metaPixelId ?? ""}
          onChange={(e) => onChange({ metaPixelId: e.target.value || null })}
          placeholder="123456789012345"
        />
        <p className="text-[11px] text-muted-foreground -mt-1">
          Dispara <code className="bg-muted px-1 rounded text-[10px]">PageView</code> ao carregar e <code className="bg-muted px-1 rounded text-[10px]">Lead</code> ao concluir.
        </p>
        <Input
          label="Google Tag ID (GTM ou GA4)"
          value={settings.googleTagId ?? ""}
          onChange={(e) => onChange({ googleTagId: e.target.value || null })}
          placeholder="G-XXXXXXXX ou GTM-XXXXXX"
        />
      </Section>

      {/* ── Notificações ──────────────────────────────────────── */}
      <Section title="Notificações">
        <Input
          label="Email para notificações"
          value={settings.notificationEmail ?? ""}
          onChange={(e) => onChange({ notificationEmail: e.target.value || null })}
          placeholder="voce@email.com"
          type="email"
        />
        <p className="text-[11px] text-muted-foreground -mt-1">
          Recebe um email a cada nova resposta. Requer <code className="bg-muted px-1 rounded text-[10px]">RESEND_API_KEY</code> no servidor.
        </p>
        <Input
          label="Webhook URL"
          value={settings.webhookUrl ?? ""}
          onChange={(e) => onChange({ webhookUrl: e.target.value || null })}
          placeholder="https://hook.eu1.make.com/..."
          type="url"
        />
        <p className="text-[11px] text-muted-foreground -mt-1">
          POST com as respostas em JSON. Conecta com n8n, Zapier, Make.
        </p>
      </Section>

      {/* ── Qualificação MQL (status) ─────────────────────────── */}
      {(() => {
        const mqlField = fields.find(f => f.isMqlField);
        return (
          <Section title="Qualificação MQL">
            {mqlField ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(125,131,189,0.10)", border: "1px solid rgba(125,131,189,0.25)" }}>
                <span style={{ color: "#7D83BD", fontSize: "14px" }}>✓</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: "#CBCDE5" }}>
                    Campo: <span className="font-semibold">{mqlField.label}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {mqlField.type === "multiple_choice"
                      ? `${(mqlField.mqlQualifyingOptions ?? []).length} opção(ões) qualificam`
                      : mqlField.type === "yes_no"
                        ? `Qualifica quando: ${mqlField.mqlYesQualifies !== false ? "Sim" : "Não"}`
                        : `Mínimo: ${(mqlField.mqlMinValue ?? 1).toLocaleString("pt-BR")}`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Nenhum campo de qualificação configurado. Selecione um campo em <strong>Perguntas</strong> e ative <em>Qualificação MQL</em>.
              </p>
            )}
          </Section>
        );
      })()}

      {/* ── Controle de acesso ────────────────────────────────── */}
      <Section title="Controle de acesso">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Máximo de respostas</label>
          <input
            type="number"
            min={1}
            value={settings.maxResponses ?? ""}
            onChange={(e) => onChange({ maxResponses: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ilimitado"
            className="w-full h-9 rounded-lg border border-input bg-background text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
          />
          <p className="text-[11px] text-muted-foreground">Fecha automaticamente após atingir o limite.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Fechar após</label>
          <input
            type="datetime-local"
            value={settings.closeAt ? settings.closeAt.slice(0, 16) : ""}
            onChange={(e) => onChange({ closeAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full h-9 rounded-lg border border-input bg-background text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">Fecha automaticamente após a data escolhida.</p>
        </div>
      </Section>

    </div>
  );
}
