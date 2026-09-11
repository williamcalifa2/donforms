"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";
import Link from "next/link";
import { UserCircle, GearSix, SignOut, CaretUp } from "@phosphor-icons/react";

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
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
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-3 transition-colors text-left"
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Avatar size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-text-active)" }}>{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--sidebar-text)" }}>{email}</p>
          </div>
          <CaretUp size={12} weight="bold" className="shrink-0" style={{ color: "var(--sidebar-text)" }} />
        </button>

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
                <UserCircle size={14} weight="duotone" /> Editar perfil
              </button>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.65)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
              >
                <GearSix size={14} weight="duotone" /> Configurações do workspace
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
                  <SignOut size={14} weight="duotone" /> Sair
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

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
