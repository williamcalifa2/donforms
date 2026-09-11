"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { extractUtms } from "@/lib/utils";
import { QuestionSlide } from "./QuestionSlide";
import type { FormField, FormSettings } from "@/types/database.types";

type PlayerState = "intro" | "playing" | "submitting" | "done" | "error" | "disqualified";

interface Props {
  formId: string;
  title: string;
  fields: FormField[];
  settings: FormSettings;
  preview?: boolean;
}

// ── Gera ID de sessão único por visita ─────────────────────────────────────
function sessionId(): string {
  try {
    let id = sessionStorage.getItem("_df_sid");
    if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem("_df_sid", id); }
    return id;
  } catch { return Math.random().toString(36).slice(2); }
}

// ── Injeta Meta Pixel ──────────────────────────────────────────────────────
function injectMetaPixel(pixelId: string) {
  if (typeof window === "undefined" || (window as unknown as Record<string, unknown>).fbq) return;
  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

// ── Injeta Google Tag ──────────────────────────────────────────────────────
function injectGoogleTag(tagId: string) {
  if (typeof window === "undefined") return;
  if (document.querySelector(`script[src*="${tagId}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
  document.head.appendChild(script);
  const inline = document.createElement("script");
  inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tagId}');`;
  document.head.appendChild(inline);
}

// ── Helper: resolve próximo campo respeitando condições ───────────────────
function matchConditionValue(operator: string, answer: string, condValue: string): boolean {
  // Suporte a múltiplos valores separados por vírgula (MC multi-select)
  const condVals = condValue.split(",").map(v => v.trim()).filter(Boolean);
  const ans = answer.trim();
  if (operator === "equals") {
    // answer pode ser qualquer um dos valores configurados
    return condVals.length > 0 && condVals.some(v => ans === v);
  }
  if (operator === "not_equals") {
    return condVals.length > 0 && condVals.every(v => ans !== v);
  }
  if (operator === "contains") {
    return condVals.some(v => ans.includes(v));
  }
  return false;
}

function resolveNext(
  fields: FormField[],
  currentIndex: number,
  answers: Record<string, string>
): number | "submit" | "disqualify" {
  const field = fields[currentIndex];
  if (field.conditions?.length) {
    for (const cond of field.conditions) {
      // Skip conditions with empty jumpTo or empty value (would match everything)
      if (!cond.jumpTo || !cond.value) continue;
      const val = answers[cond.fieldId] ?? answers[field.id] ?? "";
      const match = matchConditionValue(cond.operator, val, cond.value);
      if (match) {
        if (cond.jumpTo === "submit") return "submit";
        if (cond.jumpTo === "disqualify") return "disqualify";
        const idx = fields.findIndex(f => f.id === cond.jumpTo);
        if (idx !== -1) return idx;
      }
    }
  }
  if (currentIndex >= fields.length - 1) return "submit";
  return currentIndex + 1;
}

export function FormPlayer({ formId, title, fields, settings, preview = false }: Props) {
  const [state, setState] = useState<PlayerState>("intro");
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [disqualifyData, setDisqualifyData] = useState<{ message?: string; url?: string } | null>(null);
  const sid = useRef(sessionId());
  const abandoned = useRef(false);

  const field = fields[current];
  const inputFields = fields.filter(f => f.type !== "statement");
  const answeredCount = Object.keys(answers).length;
  const progress = state === "done" ? 100 : Math.round((answeredCount / Math.max(inputFields.length, 1)) * 100);
  const { primaryColor, bgColor, thankYouMessage, redirectUrl, metaPixelId, googleTagId } = settings;

  // ── Injetar pixels ────────────────────────────────────────────────────────
  useEffect(() => {
    if (preview) return;
    if (metaPixelId) injectMetaPixel(metaPixelId);
    if (googleTagId) injectGoogleTag(googleTagId);
  }, [metaPixelId, googleTagId, preview]);

  // ── Persistir UTMs no sessionStorage ao carregar ─────────────────────────
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const utms = extractUtms(url);
      if (Object.keys(utms).length > 0) {
        sessionStorage.setItem("_df_utms", JSON.stringify(utms));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Registrar event de view ───────────────────────────────────────────────
  useEffect(() => {
    if (preview) return;
    fetch(`/api/forms/${formId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "view", session_id: sid.current }),
    }).catch(() => null);
  }, [formId, preview]);

  // ── Registrar abandon ao sair ─────────────────────────────────────────────
  useEffect(() => {
    if (preview) return;
    const handleBeforeUnload = () => {
      if (state !== "done" && state !== "error" && !abandoned.current) {
        abandoned.current = true;
        navigator.sendBeacon(
          `/api/forms/${formId}/event`,
          new Blob(
            [JSON.stringify({ event_type: "abandon", question_index: current, session_id: sid.current })],
            { type: "application/json" }
          )
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formId, state, current, preview]);

  // ── Enter para iniciar na intro ───────────────────────────────────────────
  useEffect(() => {
    if (state !== "intro") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") handleStart(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleStart = useCallback(() => {
    setState("playing");
    if (!preview) {
      fetch(`/api/forms/${formId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "start", session_id: sid.current }),
      }).catch(() => null);
    }
  }, [formId, preview]);

  // ── Validação ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    if (field.type === "statement") return true;
    if (!field.required) return true;
    const val = (answers[field.id] ?? "").trim();
    if (!val) { setFieldError("Este campo é obrigatório."); return false; }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setFieldError("Digite um email válido."); return false;
    }
    return true;
  }, [field, answers]);

  // ── Próxima pergunta / Submit ──────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    setFieldError(undefined);
    if (!validate()) return;

    const next = resolveNext(fields, current, answers);

    // Disqualify: encerrar com mensagem personalizada
    if (next === "disqualify") {
      const field2 = fields[current];
      const matchedCond = field2.conditions?.find(cond => {
        if (!cond.jumpTo || cond.jumpTo !== "disqualify" || !cond.value) return false;
        const val = answers[cond.fieldId] ?? answers[field2.id] ?? "";
        return matchConditionValue(cond.operator, val, cond.value);
      });
      setDisqualifyData({
        message: matchedCond?.disqualifyMessage,
        url: matchedCond?.disqualifyUrl,
      });
      setState("disqualified");
      if (matchedCond?.disqualifyUrl) {
        const safeUrl = /^https?:\/\//i.test(matchedCond.disqualifyUrl) ? matchedCond.disqualifyUrl : `https://${matchedCond.disqualifyUrl}`;
        setTimeout(() => { window.location.href = safeUrl; }, 3000);
      }
      return;
    }

    if (next === "submit" || (typeof next === "number" && next >= fields.length)) {
      if (preview) { setState("done"); return; }

      setState("submitting");
      try {
        const url = new URL(window.location.href);
        // UTMs da URL atual têm prioridade; fallback para sessionStorage (persistência)
        const currentUtms = extractUtms(url);
        let storedUtms: Record<string, string> = {};
        try {
          const raw = sessionStorage.getItem("_df_utms");
          if (raw) storedUtms = JSON.parse(raw);
        } catch { /* ignore */ }
        const metadata = {
          ...storedUtms,
          ...currentUtms, // URL atual sobrescreve sessionStorage
          referrer: document.referrer || undefined,
          user_agent: navigator.userAgent,
        };

        const res = await fetch(`/api/forms/${formId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, metadata }),
        });

        if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao enviar");

        // Meta Pixel: Lead event
        if (metaPixelId && (window as unknown as Record<string, unknown>).fbq) {
          (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", "Lead");
        }
        // Google Tag: event
        if (googleTagId && (window as unknown as Record<string, unknown>).gtag) {
          (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "form_submit", { form_id: formId });
        }

        // Analytics event
        fetch(`/api/forms/${formId}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_type: "complete", session_id: sid.current }),
        }).catch(() => null);

        abandoned.current = true; // evitar abandon event no unload
        setState("done");
        if (redirectUrl) {
          const safeUrl = /^https?:\/\//i.test(redirectUrl) ? redirectUrl : `https://${redirectUrl}`;
          setTimeout(() => { window.location.href = safeUrl; }, 2500);
        }
      } catch {
        setState("error");
      }
      return;
    }

    setDirection(1);
    setCurrent(next as number);
  }, [current, fields, answers, validate, formId, preview, metaPixelId, googleTagId, redirectUrl]);

  // ── Pergunta anterior ──────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    if (current === 0) return;
    setFieldError(undefined);
    setDirection(-1);
    setCurrent((c) => c - 1);
  }, [current]);

  // ── Atualiza resposta ──────────────────────────────────────────────────────
  const handleChange = useCallback((value: string) => {
    setFieldError(undefined);
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
  }, [field.id]);

  const textColor = isDark(bgColor) ? "#ffffff" : "#1a1a1a";
  const logoUrl = settings.logoUrl;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Darker Grotesque font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;600;700;900&display=swap" />
    <motion.div
      className="don-player min-h-screen flex flex-col transition-colors duration-500"
      style={{ backgroundColor: bgColor, color: textColor, fontFamily: "'Darker Grotesque', sans-serif" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo top-right */}
      {logoUrl && (
        <div style={{
          position: "fixed", top: 16, right: 20, zIndex: 49,
          pointerEvents: "none",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              maxHeight: 36, maxWidth: 120,
              objectFit: "contain",
              opacity: 0.9,
            }}
          />
        </div>
      )}

      {/* Progress bar — 3px, accent com 40% opacidade */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: "3px", borderRadius: "32px", backgroundColor: "transparent" }}>
        <motion.div
          style={{
            height: "3px",
            borderRadius: "32px",
            backgroundColor: primaryColor,
            opacity: 0.4,
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Player body */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-16 px-4">
        <AnimatePresence mode="wait" custom={direction}>

          {/* Intro */}
          {state === "intro" && (
            <motion.div key="intro"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-xl mx-auto px-6 text-center"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}
            >
              <h1 style={{ fontSize: "36px", fontWeight: 700, lineHeight: "1.15", letterSpacing: "-0.5px", color: "#fff" }}>{title}</h1>
              <p style={{ opacity: 0.4, fontSize: "16px" }}>
                {inputFields.length} pergunta{inputFields.length !== 1 ? "s" : ""} · ~{Math.ceil(inputFields.length * 0.5)} min
              </p>
              <button onClick={handleStart}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  borderRadius: "32px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${primaryColor}44`,
                  color: "#F2F3F8",
                  fontSize: "18px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = `${primaryColor}88`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = `${primaryColor}44`; }}
              >
                Começar <span style={{ opacity: 0.6 }}>→</span>
              </button>
              <p style={{ fontSize: "12px", opacity: 0.25 }}>
                Pressione <kbd style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: "4px" }}>Enter ↵</kbd> para iniciar
              </p>
            </motion.div>
          )}

          {/* Perguntas */}
          {state === "playing" && field && (
            <QuestionSlide
              key={field.id}
              field={field}
              index={current}
              total={fields.length}
              value={answers[field.id] ?? ""}
              onChange={handleChange}
              onNext={handleNext}
              onPrev={handlePrev}
              isLast={resolveNext(fields, current, answers) === "submit"}
              primaryColor={primaryColor}
              direction={direction}
              error={fieldError}
            />
          )}

          {/* Enviando */}
          {state === "submitting" && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
              <svg className="h-10 w-10 mx-auto animate-spin opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="opacity-50 text-sm">Enviando…</p>
            </motion.div>
          )}

          {/* Obrigado */}
          {state === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-5"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-semibold">{thankYouMessage}</h2>
              {redirectUrl && <p className="text-sm opacity-40">Redirecionando em instantes…</p>}
              {preview && <p className="text-xs opacity-30 mt-2">(Modo preview — resposta não salva)</p>}
            </motion.div>
          )}

          {/* Desqualificado */}
          {state === "disqualified" && (
            <motion.div key="disqualified" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-5"
            >
              <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold" style={{ color: textColor }}>
                Obrigado pelo interesse!
              </h2>
              <p className="text-sm" style={{ color: textColor, opacity: 0.55 }}>
                {disqualifyData?.message ?? "Agradecemos o seu contato. Em breve entraremos em contato se tivermos uma oportunidade adequada."}
              </p>
              {disqualifyData?.url && (
                <p className="text-xs" style={{ color: textColor, opacity: 0.35 }}>
                  Redirecionando em instantes…
                </p>
              )}
            </motion.div>
          )}

          {/* Erro */}
          {state === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-5"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold">Algo deu errado</h2>
              <p className="opacity-50 text-sm">Não conseguimos enviar suas respostas. Tente novamente.</p>
              <button onClick={() => setState("playing")}
                className="px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}>
                Tentar novamente
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <footer className="pb-4 text-center">
        <p className="text-xs opacity-20">Criado com DonForms</p>
      </footer>
    </motion.div>
    </>
  );
}

function isDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
