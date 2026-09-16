"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { renameProject, deleteProject } from "@/app/actions/projects";
import { PencilSimple, DotsThreeVertical, Trash, FolderOpen } from "@phosphor-icons/react";

interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  formCount: number;
  clientCount: number;
}

export function ProjectRow({ project }: { project: Project }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRename = () => {
    const trimmed = nameValue.trim() || "Sem nome";
    setNameValue(trimmed);
    setEditing(false);
    if (trimmed === project.name) return;
    startTransition(async () => { await renameProject(project.id, trimmed); });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${nameValue}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => { await deleteProject(project.id); });
  };

  const initials = nameValue.slice(0, 2).toUpperCase();

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-150"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        opacity: isPending ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--card-border-hover)";
        e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-glow)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--card-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Logo */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
        style={{ background: "var(--sidebar-active)", color: "var(--accent-c)" }}
      >
        {project.logo_url
          ? <img src={project.logo_url} alt="" className="w-full h-full object-cover" />
          : initials
        }
      </div>

      {/* Name */}
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
            className="w-full text-[14px] bg-transparent border-b outline-none"
            style={{ color: "var(--text-primary)", borderColor: "var(--accent-c)", fontWeight: 500 }}
            autoFocus
          />
        ) : (
          <span
            className="text-[14px] font-medium truncate block cursor-text"
            style={{ color: "var(--text-primary)" }}
            onClick={() => { setEditing(true); setTimeout(() => nameInputRef.current?.select(), 0); }}
            title="Clique para renomear"
          >
            {nameValue}
          </span>
        )}
        <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {project.formCount} form{project.formCount !== 1 ? "s" : ""} · {project.clientCount} cliente{project.clientCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Abrir projeto"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        >
          <FolderOpen size={14} weight="duotone" />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <DotsThreeVertical size={14} weight="bold" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1.5 w-40 rounded-xl py-1.5 z-50"
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
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />
              <button onClick={handleDelete} disabled={isPending}
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
