"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { renameProject, uploadProjectLogo, deleteProject } from "@/app/actions/projects";
import {
  PencilSimple, DotsThreeVertical, Trash, Image,
} from "@phosphor-icons/react";

interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  formCount: number;
  clientCount: number;
}

export function ProjectCard({ project }: { project: Project }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [logoPreview, setLogoPreview] = useState<string | null>(project.logo_url);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleRename = () => {
    const trimmed = nameValue.trim() || "Sem nome";
    setNameValue(trimmed);
    setEditing(false);
    if (trimmed === project.name) return;
    startTransition(async () => { await renameProject(project.id, trimmed); });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    const fd = new FormData();
    fd.append("logo", file);
    startTransition(async () => {
      const res = await uploadProjectLogo(project.id, fd);
      if (res.url) setLogoPreview(res.url);
    });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${nameValue}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => { await deleteProject(project.id); });
  };

  const initials = nameValue.slice(0, 2).toUpperCase();

  return (
    <div
      className="group relative flex flex-col rounded-xl transition-all duration-200"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        padding: "18px",
        boxShadow: "var(--shadow-card)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--card-border-hover)";
        e.currentTarget.style.boxShadow = "var(--shadow-card), 0 0 0 1px var(--accent-glow)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--card-border)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Logo + Name row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar / logo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold shrink-0 cursor-pointer transition-opacity hover:opacity-70 relative overflow-hidden"
          style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}
          onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
          title="Alterar logo"
        >
          {logoPreview
            ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
            : initials
          }
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setNameValue(project.name); setEditing(false); }
              }}
              maxLength={80}
              className="w-full text-[15px] bg-transparent border-b outline-none"
              style={{ color: "var(--text-primary)", borderColor: "var(--accent-c)", fontWeight: 500 }}
              autoFocus
            />
          ) : (
            <h2
              className="text-[15px] truncate cursor-text group/title flex items-center gap-1"
              style={{ color: "var(--text-primary)", fontWeight: 500, lineHeight: "1.3" }}
              onClick={() => { setEditing(true); setTimeout(() => nameInputRef.current?.select(), 0); }}
              title="Clique para renomear"
            >
              <span className="flex-1 truncate">{nameValue}</span>
              <PencilSimple size={11} weight="duotone" className="opacity-0 group-hover/title:opacity-25 transition-opacity shrink-0" />
            </h2>
          )}
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {project.formCount} form{project.formCount !== 1 ? "s" : ""} · {project.clientCount} cliente{project.clientCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 mt-3" />

      {/* Divider */}
      <div style={{ height: 1, background: "var(--card-border)", margin: "14px 0" }} />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex-1 flex items-center justify-center h-8 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{ background: "var(--accent-soft)", color: "var(--accent-c)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-glow)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-accent)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-soft)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
          }}
        >
          Abrir
        </Link>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            <DotsThreeVertical size={15} weight="bold" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl py-1.5 z-50"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); setEditing(true); setTimeout(() => nameInputRef.current?.select(), 50); }}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <PencilSimple size={13} weight="duotone" /> Renomear
              </button>
              <button
                onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <Image size={13} weight="duotone" /> Alterar logo
              </button>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />

              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: "rgba(239,68,68,0.75)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "var(--red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.75)"; }}
              >
                <Trash size={13} weight="duotone" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
