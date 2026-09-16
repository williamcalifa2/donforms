"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { renameProject, uploadProjectLogo, deleteProject } from "@/app/actions/projects";
import {
  PencilSimple, DotsThreeVertical, Trash, Image, FolderOpen,
  FileText, Users,
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

  return (
    <div className="group relative" style={{ paddingTop: 10 }}>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Folder tab */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 20,
          width: 64,
          height: 12,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderBottom: "none",
          borderRadius: "6px 6px 0 0",
        }}
      />

      {/* Main card — flat top-left corner connects to tab */}
      <div
        className="relative flex flex-col transition-all duration-200"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "0 12px 12px 12px",
          padding: "16px",
          boxShadow: "var(--shadow-card)",
          minHeight: 160,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
          e.currentTarget.style.boxShadow = "var(--shadow-card), 0 0 0 1px rgba(245,158,11,0.15)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--card-border)";
          e.currentTarget.style.boxShadow = "var(--shadow-card)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Top row: folder icon + menu */}
        <div className="flex items-start justify-between mb-3">
          {/* Folder logo / icon */}
          <div
            className="flex items-center justify-center rounded-xl transition-all cursor-pointer relative overflow-hidden"
            style={{
              width: 44,
              height: 44,
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.20)",
              color: "#f59e0b",
              flexShrink: 0,
            }}
            onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
            title="Alterar logo"
          >
            {logoPreview
              ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              : <FolderOpen size={22} weight="duotone" />
            }
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
              }}
            >
              <DotsThreeVertical size={14} weight="bold" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1.5 z-50"
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

        {/* Project name */}
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
            className="w-full text-[14px] font-semibold bg-transparent border-b outline-none mb-0.5"
            style={{ color: "var(--text-primary)", borderColor: "#f59e0b", letterSpacing: "-0.01em" }}
            autoFocus
          />
        ) : (
          <h2
            className="text-[14px] font-semibold mb-0.5 truncate cursor-text group/title flex items-center gap-1"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: "1.35" }}
            onClick={() => { setEditing(true); setTimeout(() => nameInputRef.current?.select(), 0); }}
            title="Clique para renomear"
          >
            <span className="flex-1 truncate">{nameValue}</span>
            <PencilSimple size={10} weight="duotone" className="opacity-0 group-hover/title:opacity-25 transition-opacity shrink-0" />
          </h2>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 mt-2 mb-4">
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <FileText size={10} weight="duotone" />
            {project.formCount} form{project.formCount !== 1 ? "s" : ""}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Users size={10} weight="duotone" />
            {project.clientCount} cliente{project.clientCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex-1" />

        {/* Divider */}
        <div style={{ height: 1, background: "var(--card-border)", marginBottom: 12 }} />

        {/* Open button */}
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex items-center justify-center h-8 rounded-lg text-[12px] font-semibold transition-all duration-150 w-full"
          style={{ background: "rgba(245,158,11,0.10)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.18)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,0.18)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 12px rgba(245,158,11,0.15)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,0.10)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
          }}
        >
          Abrir pasta
        </Link>
      </div>
    </div>
  );
}
