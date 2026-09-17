"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import type React from "react";
import {
  SquaresFour, List, DotsThreeVertical, Trash,
  Eye, EyeSlash, PencilSimple, Link as PhLink,
  ChatCircle, ArrowSquareOut,
} from "@phosphor-icons/react";
import { deleteFormAsClient, togglePublishAsClient } from "@/app/actions/projects";

const STORAGE_KEY = "donforms-client-view";

interface Form {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  submission_count: number | null;
  updated_at: string;
}

interface Props {
  token: string;
  forms: Form[];
  appUrl: string;
}

export function ClientPortalForms({ token, forms, appUrl }: Props) {
  const [view, setView] = useState<"card" | "list">(() => {
    if (typeof window === "undefined") return "list";
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s === "card" || s === "list" ? s : "list";
    } catch { return "list"; }
  });

  const handleView = (v: "card" | "list") => {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  };

  if (forms.length === 0) {
    return (
      <div className="rounded-xl flex flex-col items-center justify-center py-12 text-center gap-2"
        style={{ border: "2px dashed var(--card-border, rgba(255,255,255,0.08))", color: "var(--text-tertiary, rgba(255,255,255,0.35))" }}>
        <p className="text-sm m-0">Nenhum formulário ainda.</p>
        <p className="text-xs m-0">Crie o primeiro usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle — same as ViewToggle */}
      <div className="flex justify-end">
        <div className="flex items-center rounded-lg p-0.5 gap-0.5"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.08))", border: "1px solid var(--card-border, rgba(255,255,255,0.12))" }}>
          {(["list", "card"] as const).map(v => (
            <button key={v} onClick={() => handleView(v)}
              className="flex items-center justify-center w-8 h-7 rounded-md transition-all"
              style={{
                background: view === v ? "rgba(255,255,255,0.15)" : "transparent",
                color: view === v ? "var(--text-primary, #fff)" : "var(--text-tertiary, rgba(255,255,255,0.4))",
                border: "none", cursor: "pointer",
              }}
              title={v === "card" ? "Cards" : "Lista"}>
              {v === "card"
                ? <SquaresFour size={15} weight={view === v ? "fill" : "regular"} />
                : <List size={15} weight={view === v ? "bold" : "regular"} />}
            </button>
          ))}
        </div>
      </div>

      {view === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map(f => <PortalFormCard key={f.id} form={f} token={token} appUrl={appUrl} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {forms.map(f => <PortalFormRow key={f.id} form={f} token={token} />)}
        </div>
      )}
    </div>
  );
}

// ── Card (matches FormCard visual exactly) ─────────────────────────────────────
function PortalFormCard({ form, token, appUrl }: { form: Form; token: string; appUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [published, setPublished] = useState(form.is_published);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shareUrl = `${appUrl}/f/${form.slug}`;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDelete = () => {
    setMenuOpen(false);
    if (!confirm(`Excluir "${form.title}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => { await deleteFormAsClient(token, form.id); });
  };

  const handleToggle = () => {
    setMenuOpen(false);
    const next = !published;
    setPublished(next);
    startTransition(async () => { await togglePublishAsClient(token, form.id, next); });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formattedDate = new Date(form.updated_at).toLocaleDateString("pt-BR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="group relative flex flex-col rounded-xl transition-all duration-200"
      style={{
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
        padding: 18, boxShadow: "var(--shadow-card)",
        opacity: isPending ? 0.6 : 1,
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
      {/* Status + count */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase"
          style={published
            ? { background: "rgba(34,197,94,0.10)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.2)" }
            : { background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="rounded-full" style={{
            width: 5, height: 5, flexShrink: 0,
            background: published ? "var(--green)" : "var(--text-tertiary)",
            boxShadow: published ? "0 0 5px var(--green)" : "none",
          }} />
          {published ? "Publicado" : "Rascunho"}
        </span>
        <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {form.submission_count ?? 0} resp.
        </span>
      </div>

      {/* Title */}
      <h2 className="font-semibold text-[15px] mb-1 line-clamp-2 flex items-start gap-1"
        style={{ color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.35 }}>
        <span className="flex-1">{form.title}</span>
        <PencilSimple size={11} weight="duotone" className="opacity-0 group-hover:opacity-30 transition-opacity shrink-0 mt-0.5" />
      </h2>

      {/* Date */}
      <p className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>{formattedDate}</p>

      {/* Share URL */}
      <button onClick={handleCopy}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-[11px] mb-4 transition-all duration-150"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-tertiary)" }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-glow)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
        }}
        title="Clique para copiar link">
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
        <Link href={`/c/${token}/forms/${form.id}/edit`}
          className="flex-1 flex items-center justify-center h-8 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{ background: "var(--accent-soft)", color: "var(--accent-c)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-glow)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-accent)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-soft)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
          }}>
          Editar
        </Link>

        {/* Icon actions */}
        {(
          [
            { href: `/c/${token}/forms/${form.id}/analytics`, icon: <ChatCircle size={14} weight="duotone" />, title: "Respostas & Analytics" },
            ...(published ? [{ href: `/f/${form.slug}`, icon: <ArrowSquareOut size={14} weight="duotone" />, title: "Abrir formulário", target: "_blank" }] : []),
          ] as { href: string; icon: React.ReactNode; title: string; target?: string }[]
        ).map(({ href, icon, title, target }) => (
          <Link
            key={title}
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
          <button onClick={() => setMenuOpen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)", border: "none", background: "transparent", cursor: "pointer" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}>
            <DotsThreeVertical size={15} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl py-1.5 z-50"
              style={{
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}>
              <button onClick={handleToggle} disabled={isPending}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: published ? "var(--amber)" : "var(--green)", border: "none", background: "transparent", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                {published ? <EyeSlash size={13} weight="duotone" /> : <Eye size={13} weight="duotone" />}
                {published ? "Despublicar" : "Publicar"}
              </button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />
              <button onClick={handleDelete} disabled={isPending}
                className="w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center gap-2.5 transition-colors"
                style={{ color: "rgba(239,68,68,0.75)", border: "none", background: "transparent", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "var(--red)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.75)"; }}>
                <Trash size={13} weight="duotone" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Row (matches FormRow visual) ───────────────────────────────────────────────
function PortalFormRow({ form, token }: { form: Form; token: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Excluir "${form.title}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => { await deleteFormAsClient(token, form.id); });
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150"
      style={{
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
        opacity: isPending ? 0.5 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--card-border-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; }}>
      {/* Status dot */}
      <span className="rounded-full shrink-0" style={{
        width: 6, height: 6,
        background: form.is_published ? "var(--green)" : "var(--text-tertiary)",
        boxShadow: form.is_published ? "0 0 4px var(--green)" : "none",
      }} />

      {/* Title */}
      <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
        {form.title}
      </span>

      {/* Count */}
      <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
        {form.submission_count ?? 0} resp.
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/c/${token}/forms/${form.id}/edit`}
          className="h-7 px-2.5 flex items-center rounded-lg text-[11px] font-semibold transition-all"
          style={{ background: "var(--accent-soft)", color: "var(--accent-c)" }}>
          Editar
        </Link>
        <Link href={`/c/${token}/forms/${form.id}/analytics`}
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Respostas & Analytics"
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}>
          <ChatCircle size={13} weight="duotone" />
        </Link>
        <button onClick={handleDelete} disabled={isPending}
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(239,68,68,0.6)", border: "none", background: "transparent", cursor: "pointer" }}
          title="Excluir"
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "var(--red)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.6)"; }}>
          <Trash size={13} weight="duotone" />
        </button>
      </div>
    </div>
  );
}
