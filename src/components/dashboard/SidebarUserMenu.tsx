"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";
import Link from "next/link";

interface Props {
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  workspaceName: string;
  workspaceLogoUrl: string | null;
}

export function SidebarUserMenu({ displayName, email, initials, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const file = fileRef.current?.files?.[0] ?? null;
    const fd = new FormData();
    fd.append("name", name);
    if (file) fd.append("avatar", file);
    startTransition(async () => {
      await updateProfile(fd);
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditOpen(false); setOpen(false); }, 1200);
    });
  };

  const Avatar = ({ size }: { size: "sm" | "lg" }) => {
    const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-14 w-14 text-sm";
    if (previewUrl) return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewUrl} alt={displayName} className={`${cls} rounded-full object-cover`} />
    );
    return (
      <div className={`${cls} rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-semibold shrink-0`}>
        {initials}
      </div>
    );
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Trigger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-3 transition-colors text-left"
          style={{
            color: "var(--sidebar-text)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Avatar size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-text-active)" }}>{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--sidebar-text)" }}>{email}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3 w-3 shrink-0" style={{ color: "var(--sidebar-text)" }}>
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>

        {/* Dropdown — abre pra cima */}
        {open && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl shadow-2xl overflow-hidden z-50"
            style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-medium text-white">{displayName}</p>
              <p className="text-[10px]" style={{ color: "var(--sidebar-text)" }}>{email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setEditOpen(true); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                style={{ color: "rgba(255,255,255,0.65)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Editar perfil
              </button>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.65)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                Configurações do workspace
              </Link>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <form action={signOut}>
                <button type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left"
                  style={{ color: "rgba(255,100,100,0.8)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,50,50,0.08)"; e.currentTarget.style.color = "#ff6b6b"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,100,100,0.8)"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sair
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal editar perfil */}
      {editOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setEditOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-semibold text-sm">Editar perfil</h2>
                <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar size="lg" />
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline">
                    Trocar foto
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Nome</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={handleSave}
                  disabled={isPending || !name.trim()}
                  className={`w-full h-9 rounded-lg text-sm font-medium transition-all ${saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"}`}
                >
                  {saved ? "✓ Salvo!" : isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
