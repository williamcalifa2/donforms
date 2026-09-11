"use client";

import { useState, useRef, useTransition } from "react";
import { updateWorkspace } from "@/app/actions/workspace";

interface Props {
  profile: {
    name?: string;
    email?: string;
    workspace_name?: string | null;
    workspace_logo_url?: string | null;
  } | null;
}

export function WorkspaceSettingsForm({ profile }: Props) {
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(profile?.workspace_logo_url ?? null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const file = logoRef.current?.files?.[0] ?? null;
    const fd = new FormData();
    fd.append("workspace_name", workspaceName);
    if (file) fd.append("workspace_logo", file);

    startTransition(async () => {
      await updateWorkspace(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Workspace */}
      <div className="rounded-xl p-5 space-y-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-sm font-semibold">Identidade do workspace</h2>

        {/* Logo */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Logo</label>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl border-2 border-dashed border-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="h-6 w-6 text-muted-foreground">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 9l6 6M15 9l-6 6"/>
                </svg>
              )}
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => logoRef.current?.click()}
                className="text-xs border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
              >
                {logoPreview ? "Trocar logo" : "Fazer upload"}
              </button>
              {logoPreview && (
                <button
                  onClick={() => { setLogoPreview(null); if (logoRef.current) logoRef.current.value = ""; }}
                  className="block text-xs text-destructive hover:underline"
                >
                  Remover
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG. Recomendado: 64×64px</p>
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        {/* Nome do workspace */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nome do workspace</label>
          <input
            type="text"
            value={workspaceName}
            onChange={e => setWorkspaceName(e.target.value)}
            placeholder="Ex: Grupo Don, Agência XYZ…"
            maxLength={60}
            className="w-full h-9 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">Aparece no canto superior esquerdo da sidebar.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className={`h-9 px-5 rounded-lg text-sm font-medium transition-all ${
            saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          }`}
        >
          {saved ? "✓ Salvo!" : isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-sm font-semibold">Conta</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span>{profile?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{profile?.email ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
