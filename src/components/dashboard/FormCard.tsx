"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { duplicateForm, deleteForm, renameForm } from "@/app/actions/forms";
import { formatDate } from "@/lib/utils";
import type { FormWithCount } from "@/types/database.types";

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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const shareUrl = `${appUrl}/f/${form.slug}`;

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

  return (
    <div
      className="group relative flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(238 100% 74% / 0.3)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--card-border)")}
    >
      {/* Status badge + count */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={
            form.is_published
              ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: form.is_published ? "#4ade80" : "rgba(255,255,255,0.3)" }}
          />
          {form.is_published ? "Publicado" : "Rascunho"}
        </span>
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {form.submission_count} resposta{form.submission_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Title — clique para renomear */}
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
          className="w-full font-medium text-sm mb-1 bg-transparent border-b outline-none"
          style={{ color: "rgba(255,255,255,0.88)", borderColor: "hsl(238 100% 74% / 0.5)" }}
          autoFocus
        />
      ) : (
        <h2
          className="font-medium text-sm mb-1 line-clamp-2 flex-1 cursor-text group/title flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.88)" }}
          onClick={() => { setEditing(true); setTimeout(() => titleInputRef.current?.select(), 0); }}
          title="Clique para renomear"
        >
          <span className="flex-1">{titleValue}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3 w-3 opacity-0 group-hover/title:opacity-40 transition-opacity shrink-0">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </h2>
      )}
      <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
        {formatDate(form.updated_at)}
      </p>

      {/* Share URL */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] mb-3 transition-colors"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px dashed rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.4)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(238 100% 74% / 0.5)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
        }}
        title="Clique para copiar link"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
        <span className="truncate flex-1">{shareUrl.replace("https://", "")}</span>
        <span className="shrink-0" style={{ color: copied ? "#4ade80" : "inherit" }}>
          {copied ? "✓" : "Copiar"}
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Edit */}
        <Link
          href={`/dashboard/forms/${form.id}/edit`}
          className="flex-1 flex items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(123,123,255,0.15)", color: "hsl(238 100% 74%)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(123,123,255,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(123,123,255,0.15)")}
        >
          Editar
        </Link>

        {/* Responses */}
        <Link
          href={`/dashboard/forms/${form.id}/responses`}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          title="Respostas"
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3.5 w-3.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </Link>

        {/* Analytics */}
        <Link
          href={`/dashboard/forms/${form.id}/analytics`}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          title="Analytics"
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3.5 w-3.5">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </Link>

        {/* Open form */}
        {form.is_published && (
          <Link
            href={`/f/${form.slug}`}
            target="_blank"
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            title="Abrir formulário"
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="h-3.5 w-3.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        )}

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="h-3.5 w-3.5">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 bottom-full mb-1 w-40 rounded-xl py-1 z-20 shadow-2xl"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              >
                <button
                  onClick={handleDuplicate}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="h-3.5 w-3.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Duplicar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: "rgba(255,100,100,0.8)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,50,50,0.08)"; e.currentTarget.style.color = "#ff6b6b"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,100,100,0.8)"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="h-3.5 w-3.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
