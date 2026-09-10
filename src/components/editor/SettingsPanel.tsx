"use client";

import { Input } from "@/components/ui/input";
import type { FormSettings } from "@/types/database.types";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#64748b", // slate
  "#18181b", // zinc dark
  "#000000", // black
];

interface Props {
  settings: FormSettings;
  onChange: (patch: Partial<FormSettings>) => void;
}

export function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Cor primária */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Cor primária</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ primaryColor: color })}
              title={color}
              className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: settings.primaryColor === color ? color : "transparent",
                outline: settings.primaryColor === color ? `2px solid ${color}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
          {/* Custom color input */}
          <div className="relative h-7 w-7">
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="Cor personalizada"
            />
            <div
              className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center text-[10px] text-muted-foreground"
              style={{ backgroundColor: settings.primaryColor }}
            >
              +
            </div>
          </div>
        </div>
      </div>

      {/* Cor de fundo */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Cor de fundo</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={settings.bgColor}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="h-9 w-16 rounded-lg border border-input cursor-pointer p-0.5"
          />
          <Input
            value={settings.bgColor}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            placeholder="#ffffff"
            className="font-mono text-xs"
          />
        </div>
      </div>

      {/* Mensagem de obrigado */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">
          Mensagem de confirmação
        </label>
        <textarea
          value={settings.thankYouMessage}
          onChange={(e) => onChange({ thankYouMessage: e.target.value })}
          rows={3}
          maxLength={300}
          placeholder="Obrigado! Suas respostas foram enviadas."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground text-right">
          {settings.thankYouMessage.length}/300
        </p>
      </div>

      {/* URL de redirecionamento */}
      <Input
        label="Redirecionar após envio (opcional)"
        value={settings.redirectUrl ?? ""}
        onChange={(e) =>
          onChange({ redirectUrl: e.target.value || null })
        }
        placeholder="https://seusite.com/obrigado"
        type="url"
      />

      {/* Preview das cores */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Preview</label>
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: settings.bgColor }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "#1a1a1a" }}>
            Como podemos te ajudar?
          </p>
          <button
            className="px-4 py-2 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: settings.primaryColor }}
          >
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}
