"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { duplicateForm, deleteForm, renameForm, togglePublish } from "@/app/actions/forms";
import { formatDate } from "@/lib/utils";
import type { FormWithCount } from "@/types/database.types";
import {
  PencilSimple, Link as PhLink, ChatCircle, ChartBar,
  ArrowSquareOut, DotsThreeVertical, CopySimple, Trash,
  Eye, EyeSlash,
} from "@phosphor-icons/react";

interface Props {
  form: FormWithCount;
  appUrl: string;
}

export function FormCard({ form, appUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(form.title);
  const [published, setPublished] = useState(form.is_published);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shareUrl = `${appUrl}/f/${form.slug}`;

  // Fecha menu ao clicar fora
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
    const trimmed = titleValue.trim() || "Sem título";
    setTitleValue(trimmed);
    setEditing(false);
    if (trimmed === form.title) return;
    startTransition(async () => { await renameForm(form.id, trimmed); });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDuplicate = () => {
    setMenuOpen(false);
    startTransition(async () => { await duplicateForm(form.id); });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${form.title}"? Esta ação não pode ser desfeita.`)) return;
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
      {/* Top row: status + response count */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase"
          style={published
            ? { background: "rgba(34,197,94,0.10)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.2)" }
            : { background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span
            className="rounded-full"
            style={{
              width: 5, height: 5, flexShrink: 0,
              background: published ? "var(--green)" : "var(--text-tertiary)",
              boxShadow: published ? "0 0 5px var(--green)" : "none",
            }}
          />
          {published ? "Publicado" : "Rascunho"}
        </span>
        <span
          className="text-[11px] font-medium tabular-nums"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
        >
          {form.submission_count} resp.
        </span>
      </div>

      {/* Title */}
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
          className="w-full font-semibold text-[15px] mb-1 bg-transparent border-b outline-none"
          style={{ color: "var(--text-primary)", borderColor: "var(--accent)", letterSpacing: "-0.01em" }}
          autoFocus
        />
      ) : (
        <h2
          className="font-semibold text-[15px] mb-1 line-clamp-2 flex-1 cursor-text group/title flex items-start gap-1"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: "1.35" }}
          onClick={() => { setEditing(true); setTimeout(() => titleInputRef.current?.select(), 0); }}
          title="Clique para renomear"
        >
          <span className="flex-1">{titleValue}</span>
          <PencilSimple size={11} weight="duotone" className="opacity-0 group-hover/title:opacity-30 transition-opacity shrink-0 mt-0.5" />
        </h2>
      )}
      <p className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
        {formatDate(form.updated_at)}
      </p>

      {/* Share URL */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-[11px] mb-4 transition-all duration-150"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "var(--text-tertiary)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-glow)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
        }}
        title="Clique para copiar link"
      >
        <PhLink size={12} weight="duotone" className="shrink-0" />
        <span className="truncate flex-1" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
          {shareUrl.replace("https://", "")}
        </span>
        <span className="shrink-0 font-medium" style={{ color: copied ? "var(--green)" : "inherit" }}>
          {copied ? "✓" : "Copiar"}
        </span>
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--card-border)", marginBottom: 14 }} />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Link
          href={`/dashboard/forms/${form.id}/edit`}
          className="flex-1 flex items-center justify-center h-8 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(108,99,255,0.20)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-accent)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-soft)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
          }}
        >
          Editar
        </Link>

        {(
          [
            { href: `/dashboard/forms/${form.id}/responses`, icon: <ChatCircle size={14} weight="duotone" />, title: "Respostas" },
            { href: `/dashboard/forms/${form.id}/analytics`, icon: <ChartBar size={14} weight="duotone" />, title: "Analytics" },
            ...(published ? [{ href: `/f/${form.slug}`, icon: <ArrowSquareOut size={14} weight="duotone" />, title: "Abrir formulário", target: "_blank" }] : []),
          ] as { href: string; icon: React.ReactNode; title: string; target?: string }[]
        ).map(({ href, icon, title, target }) => (
          <Link
            key={href}
            href={href}
            target={target}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title={title}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
            }}
          >
            {icon}
          </Link>
        ))}

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
                background: "#0F1120",
                border: "1px solid var(--sidebar-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              <button
                onClick={handleTogglePublish}
                disabled={isPending}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: published ? "var(--amber)" : "var(--green)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {published
                  ? <EyeSlash size={13} weight="duotone" />
                  : <Eye size={13} weight="duotone" />}
                {published ? "Despublicar" : "Publicar"}
              </button>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />

              <button
                onClick={handleDuplicate}
                disabled={isPending}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <CopySimple size={13} weight="duotone" /> Duplicar
              </button>
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
