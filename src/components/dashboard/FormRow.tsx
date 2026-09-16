"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { duplicateForm, deleteForm, renameForm, togglePublish } from "@/app/actions/forms";
import { formatDate } from "@/lib/utils";
import type { FormWithCount } from "@/types/database.types";
import {
  PencilSimple, ChatCircle, ChartBar,
  DotsThreeVertical, CopySimple, Trash, Eye, EyeSlash,
} from "@phosphor-icons/react";

interface Props {
  form: FormWithCount;
  appUrl: string;
}

export function FormRow({ form, appUrl }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(form.title);
  const [published, setPublished] = useState(form.is_published);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleRename = () => {
    const trimmed = titleValue.trim() || "Sem título";
    setTitleValue(trimmed);
    setEditing(false);
    if (trimmed === form.title) return;
    startTransition(async () => { await renameForm(form.id, trimmed); });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${titleValue}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => { await deleteForm(form.id); });
  };

  const handleTogglePublish = () => {
    setMenuOpen(false);
    const next = !published;
    setPublished(next);
    startTransition(async () => { await togglePublish(form.id, next); });
  };

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
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: published ? "var(--green)" : "var(--text-tertiary)",
          boxShadow: published ? "0 0 5px var(--green)" : "none",
        }}
      />

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setTitleValue(form.title); setEditing(false); }
            }}
            maxLength={100}
            className="w-full text-[14px] bg-transparent border-b outline-none"
            style={{ color: "var(--text-primary)", borderColor: "var(--accent-c)", fontWeight: 500 }}
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[14px] font-medium truncate cursor-text"
              style={{ color: "var(--text-primary)" }}
              onClick={() => { setEditing(true); setTimeout(() => titleInputRef.current?.select(), 0); }}
              title="Clique para renomear"
            >
              {titleValue}
            </span>
          </div>
        )}
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {formatDate(form.created_at)}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-1 shrink-0" style={{ color: "var(--text-tertiary)" }}>
        <ChatCircle size={12} weight="duotone" />
        <span className="text-[12px] tabular-nums">{form.submission_count}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link
          href={`/dashboard/forms/${form.id}/edit`}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Editar"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        >
          <PencilSimple size={14} weight="duotone" />
        </Link>
        <Link
          href={`/dashboard/forms/${form.id}/responses`}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Respostas"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        >
          <ChatCircle size={14} weight="duotone" />
        </Link>
        <Link
          href={`/dashboard/forms/${form.id}/analytics`}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Analytics"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        >
          <ChartBar size={14} weight="duotone" />
        </Link>

        {/* Menu */}
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
              className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl py-1.5 z-50"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              {[
                { icon: <PencilSimple size={13} weight="duotone" />, label: "Renomear", action: () => { setMenuOpen(false); setEditing(true); setTimeout(() => titleInputRef.current?.select(), 50); } },
                { icon: published ? <EyeSlash size={13} weight="duotone" /> : <Eye size={13} weight="duotone" />, label: published ? "Despublicar" : "Publicar", action: handleTogglePublish },
                { icon: <CopySimple size={13} weight="duotone" />, label: "Duplicar", action: () => { setMenuOpen(false); startTransition(async () => { await duplicateForm(form.id); }); } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />
              <button onClick={handleDelete}
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
