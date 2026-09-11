"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  slug: string;
  appUrl: string;
  isPublished: boolean;
}

export function ShareModal({ slug, appUrl, isPublished }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${appUrl}/f/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(8,9,16,0.75)", backdropFilter: "blur(6px)" }}
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden pointer-events-auto"
          style={{
            background: "var(--card-bg)",
            border: "1px solid hsl(238 100% 74% / 0.15)",
            boxShadow: "0 24px 60px -12px hsl(238 100% 74% / 0.15), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: "rgba(123,123,255,0.15)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" style={{ color: "hsl(238 100% 74%)" }}>
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <h2 className="font-semibold text-sm">Compartilhar</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {!isPublished && (
              <div className="rounded-lg px-3 py-2.5 text-xs flex items-center gap-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", color: "#fbbf24" }}>
                <span>⚠</span>
                <span>Rascunho — publique para ativar o link.</span>
              </div>
            )}

            {/* Link */}
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Link público</p>
              <code className="block text-[11px] font-mono break-all leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                {shareUrl}
              </code>
              <button
                onClick={copy}
                className="w-full h-8 rounded-lg text-xs font-semibold transition-all"
                style={copied
                  ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                  : { background: "var(--gradient-primary)", color: "#fff", boxShadow: "0 2px 12px hsl(238 100% 74% / 0.2)" }}
              >
                {copied ? "✓ Link copiado!" : "Copiar link"}
              </button>
            </div>

            {/* QR Code */}
            <div className="flex items-center gap-4 px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=000000&qzone=1`}
                alt="QR Code"
                width={80}
                height={80}
                className="rounded-xl shrink-0"
                style={{ border: "1px solid var(--card-border)" }}
              />
              <div className="space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <p>Escaneie para abrir no celular.</p>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=000000&qzone=2`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 transition-colors"
                  style={{ color: "hsl(238 100% 74%)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Baixar QR Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartilhar
      </button>
      {open && createPortal(modal, document.body)}
    </>
  );
}
