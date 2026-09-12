"use client";

import { useRef, useState, useCallback } from "react";

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface Props {
  value: string; // JSON string of UploadedFile | ""
  onChange: (v: string) => void;
  primaryColor: string;
  accentRgb: [number, number, number];
  formId: string;
  fieldId: string;
  accept?: string;   // e.g. "image/*", "application/pdf", "*"
  maxSizeMb?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function acceptLabel(accept?: string): string {
  if (!accept || accept === "*") return "Qualquer arquivo";
  if (accept === "image/*")       return "Imagens";
  if (accept === "application/pdf") return "PDF";
  if (accept.includes("pdf") && accept.includes("doc")) return "Documentos";
  return accept;
}

export function FileUploadField({
  value, onChange, primaryColor, accentRgb,
  formId, fieldId, accept = "*", maxSizeMb = 10,
}: Props) {
  const [r, g, b] = accentRgb;
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]  = useState(0);
  const [error, setError]        = useState<string | null>(null);
  const [dragging, setDragging]  = useState(false);

  const uploaded: UploadedFile | null = (() => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  })();

  const doUpload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(10);

    // Fake progress while uploading
    const ticker = setInterval(() => {
      setProgress(p => Math.min(p + 12, 88));
    }, 180);

    try {
      const fd = new FormData();
      fd.append("file",      file);
      fd.append("formId",    formId);
      fd.append("fieldId",   fieldId);
      fd.append("accept",    accept);
      fd.append("maxSizeMb", String(maxSizeMb));

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Erro no upload.");

      setProgress(100);
      onChange(JSON.stringify(json as UploadedFile));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
      onChange("");
    } finally {
      clearInterval(ticker);
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }, [formId, fieldId, accept, maxSizeMb, onChange]);

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    doUpload(file);
  }, [doUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const isImage = uploaded?.type.startsWith("image/");

  // ── Uploaded state ─────────────────────────────────────────────────────────
  if (uploaded && !uploading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Preview for images */}
        {isImage && (
          <div style={{
            borderRadius: 12, overflow: "hidden",
            border: `1px solid ${primaryColor}30`,
            maxHeight: 200,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploaded.url} alt={uploaded.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* File info card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 12,
          background: `${primaryColor}12`,
          border: `1px solid ${primaryColor}30`,
        }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `${primaryColor}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {isImage ? "🖼️" : uploaded.type === "application/pdf" ? "📄" : "📎"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: "#fff",
              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{uploaded.name}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
              {formatBytes(uploaded.size)}
            </p>
          </div>

          {/* Remove */}
          <button
            onClick={() => { onChange(""); setError(null); }}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 13,
            }}
            title="Remover arquivo"
          >✕</button>
        </div>
      </div>
    );
  }

  // ── Upload zone ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          borderRadius: 16,
          border: `1.5px dashed ${dragging ? primaryColor : `${primaryColor}35`}`,
          background: dragging ? `${primaryColor}10` : "rgba(255,255,255,0.03)",
          padding: "32px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          cursor: uploading ? "default" : "pointer",
          transition: "all 0.15s ease",
          userSelect: "none",
        }}
      >
        {uploading ? (
          <>
            {/* Progress */}
            <div style={{ width: 44, height: 44, position: "relative" }}>
              <svg viewBox="0 0 44 44" width="44" height="44" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle cx="22" cy="22" r="18" fill="none"
                  stroke={primaryColor} strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.2s ease" }}
                />
              </svg>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 }}>
              Enviando… {progress}%
            </p>
          </>
        ) : (
          <>
            {/* Upload icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `${primaryColor}18`,
              border: `1px solid ${primaryColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
              boxShadow: `0 0 20px rgba(${r},${g},${b},0.2)`,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke={primaryColor} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: "0 0 4px" }}>
                Arraste ou{" "}
                <span style={{ color: primaryColor, textDecoration: "underline" }}>clique para enviar</span>
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                {acceptLabel(accept)} · máx. {maxSizeMb}MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{
          fontSize: 13, color: "#ff6b6b", margin: 0,
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(255,107,107,0.08)",
          border: "1px solid rgba(255,107,107,0.2)",
        }}>⚠ {error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept === "*" ? undefined : accept}
        style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
