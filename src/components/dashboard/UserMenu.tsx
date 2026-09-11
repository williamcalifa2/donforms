"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";

interface Props {
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
}

export function UserMenu({ displayName, email, initials, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fecha dropdown ao clicar fora
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
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
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
      setTimeout(() => {
        setSaved(false);
        setEditOpen(false);
        setOpen(false);
      }, 1200);
    });
  };

  const avatar = (size: "sm" | "md" | "lg") => {
    const cls = {
      sm: "h-8 w-8 text-xs",
      md: "h-12 w-12 text-sm",
      lg: "h-16 w-16 text-base",
    }[size];
    if (previewUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={displayName}
          className={`${cls} rounded-full object-cover border-2 border-white shadow-sm`} />
      );
    }
    return (
      <div className={`${cls} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold border-2 border-white shadow-sm`}>
        {initials}
      </div>
    );
  };

  return (
    <>
      {/* Avatar clicável */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {avatar("sm")}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* User info header */}
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { setEditOpen(true); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-muted-foreground">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Editar perfil
              </button>
            </div>

            <div className="border-t py-1">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="h-3.5 w-3.5">
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
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setEditOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-semibold text-sm">Editar perfil</h2>
                <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
              </div>

              <div className="p-5 space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  {avatar("lg")}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-primary hover:underline"
                  >
                    Trocar foto
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Seu nome"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={handleSave}
                  disabled={isPending || !name.trim()}
                  className={`w-full h-9 rounded-lg text-sm font-medium transition-all ${
                    saved
                      ? "bg-green-500 text-white"
                      : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  }`}
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
