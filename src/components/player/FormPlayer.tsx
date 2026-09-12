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

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("_df_sid");
    if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem("_df_sid", id); }
    return id;
  } catch { return Math.random().toString(36).slice(2); }
}

function injectMetaPixel(pixelId: string) {
  if (typeof window === "undefined" || (window as unknown as Record<string, unknown>).fbq) return;
  const script = document.createElement("script");
  script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  document.head.appendChild(script);
}

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

function matchConditionValue(operator: string, answer: string, condValue: string): boolean {
  const condVals = condValue.split(",").map(v => v.trim()).filter(Boolean);
  const ans = answer.trim();
  if (operator === "equals") return condVals.length > 0 && condVals.some(v => ans === v);
  if (operator === "not_equals") return condVals.length > 0 && condVals.every(v => ans !== v);
  if (operator === "contains") return condVals.some(v => ans.includes(v));
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

// Hex → RGB para manipulação de cor
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  if (c.length < 6) return [100, 100, 200];
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

// Circular progress SVG
function CircularProgress({ progress, color, step, total }: { progress: number; color: string; step: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ position: "relative", width: 56, height: 56 }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <motion.circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.7)", lineHeight: 1,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{step}</span>
        <span style={{ fontSize: 9, opacity: 0.5 }}>/{total}</span>
      </div>
    </motion.div>
  );
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
  const startedAt = useRef<number | null>(null);   // when user began answering
  const honeypot  = useRef<HTMLInputElement>(null); // hidden bait field

  const field = fields[current];
  const inputFields = fields.filter(f => f.type !== "statement");
  const answeredCount = Object.keys(answers).length;
  const progress = state === "done" ? 100 : Math.round((answeredCount / Math.max(inputFields.length, 1)) * 100);
  const { primaryColor, bgColor, thankYouMessage, redirectUrl, metaPixelId, googleTagId } = settings;
  const [r, g, b] = hexToRgb(primaryColor);
  const logoUrl = settings.logoUrl;
  const dark = isDark(bgColor);
  const textColor = dark ? "#ffffff" : "#1a1a1a";

  useEffect(() => {
    if (preview) return;
    if (metaPixelId) injectMetaPixel(metaPixelId);
    if (googleTagId) injectGoogleTag(googleTagId);
  }, [metaPixelId, googleTagId, preview]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const utms = extractUtms(url);
      if (Object.keys(utms).length > 0) sessionStorage.setItem("_df_utms", JSON.stringify(utms));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (preview) return;
    fetch(`/api/forms/${formId}/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "view", session_id: sid.current }),
    }).catch(() => null);
  }, [formId, preview]);

  useEffect(() => {
    if (preview) return;
    const handleBeforeUnload = () => {
      if (state !== "done" && state !== "error" && !abandoned.current) {
        abandoned.current = true;
        navigator.sendBeacon(`/api/forms/${formId}/event`,
          new Blob([JSON.stringify({ event_type: "abandon", question_index: current, session_id: sid.current })],
            { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formId, state, current, preview]);

  useEffect(() => {
    if (state !== "intro") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") handleStart(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleStart = useCallback(() => {
    startedAt.current = Date.now();
    setState("playing");
    if (!preview) {
      fetch(`/api/forms/${formId}/event`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "start", session_id: sid.current }),
      }).catch(() => null);
    }
  }, [formId, preview]);

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

  const handleNext = useCallback(async () => {
    setFieldError(undefined);
    if (!validate()) return;
    const next = resolveNext(fields, current, answers);

    if (next === "disqualify") {
      const f2 = fields[current];
      const matchedCond = f2.conditions?.find(cond => {
        if (!cond.jumpTo || cond.jumpTo !== "disqualify" || !cond.value) return false;
        const val = answers[cond.fieldId] ?? answers[f2.id] ?? "";
        return matchConditionValue(cond.operator, val, cond.value);
      });
      setDisqualifyData({ message: matchedCond?.disqualifyMessage, url: matchedCond?.disqualifyUrl });
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
        const currentUtms = extractUtms(url);
        let storedUtms: Record<string, string> = {};
        try { const raw = sessionStorage.getItem("_df_utms"); if (raw) storedUtms = JSON.parse(raw); } catch { /* */ }
        const metadata = { ...storedUtms, ...currentUtms, referrer: document.referrer || undefined, user_agent: navigator.userAgent };
        const res = await fetch(`/api/forms/${formId}/submit`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            metadata,
            _honeypot: honeypot.current?.value ?? "",
            _startedAt: startedAt.current ?? 0,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
        if (metaPixelId && (window as unknown as Record<string, unknown>).fbq)
          (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", "Lead");
        if (googleTagId && (window as unknown as Record<string, unknown>).gtag)
          (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "form_submit", { form_id: formId });
        fetch(`/api/forms/${formId}/event`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_type: "complete", session_id: sid.current }),
        }).catch(() => null);
        abandoned.current = true;
        setState("done");
        if (redirectUrl) {
          const safeUrl = /^https?:\/\//i.test(redirectUrl) ? redirectUrl : `https://${redirectUrl}`;
          setTimeout(() => { window.location.href = safeUrl; }, 2500);
        }
      } catch { setState("error"); }
      return;
    }

    setDirection(1);
    setCurrent(next as number);
  }, [current, fields, answers, validate, formId, preview, metaPixelId, googleTagId, redirectUrl]);

  const handlePrev = useCallback(() => {
    if (current === 0) return;
    setFieldError(undefined);
    setDirection(-1);
    setCurrent(c => c - 1);
  }, [current]);

  const handleChange = useCallback((value: string) => {
    setFieldError(undefined);
    setAnswers(prev => ({ ...prev, [field.id]: value }));
  }, [field.id]);

  const inputFieldIndex = field ? inputFields.findIndex(f => f.id === field.id) : -1;
  const displayStep = inputFieldIndex >= 0 ? inputFieldIndex + 1 : current + 1;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;600;700;900&display=swap" />

      {/* Blob animation keyframes */}
      <style>{`
        @keyframes df-blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(60px,-80px) scale(1.15); }
          66%      { transform: translate(-40px,40px) scale(0.9); }
        }
        @keyframes df-blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-70px,50px) scale(1.1); }
          66%      { transform: translate(50px,-30px) scale(0.95); }
        }
        @keyframes df-blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(30px,60px) scale(1.05); }
        }
        .df-player input:focus,
        .df-player textarea:focus { outline: none; }
        .df-player * { box-sizing: border-box; }
      `}</style>

      {/* Honeypot — invisible bait for bots; humans never see or fill this */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, left: -9999 }}
      />

      <div
        className="df-player don-player"
        style={{
          minHeight: "100dvh",
          height: "100dvh",
          overflow: "hidden",
          position: "relative",
          backgroundColor: bgColor,
          fontFamily: "'Darker Grotesque', sans-serif",
          color: textColor,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Animated background blobs ── */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          <div style={{
            position: "absolute",
            width: "60vw", height: "60vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.28) 0%, transparent 70%)`,
            top: "-20%", left: "-10%",
            animation: "df-blob1 18s ease-in-out infinite",
            willChange: "transform",
          }} />
          <div style={{
            position: "absolute",
            width: "50vw", height: "50vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.20) 0%, transparent 70%)`,
            bottom: "-15%", right: "-5%",
            animation: "df-blob2 22s ease-in-out infinite",
            willChange: "transform",
          }} />
          <div style={{
            position: "absolute",
            width: "35vw", height: "35vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.14) 0%, transparent 70%)`,
            top: "40%", left: "60%",
            animation: "df-blob3 14s ease-in-out infinite",
            willChange: "transform",
          }} />
        </div>

        {/* ── Logo ── */}
        {logoUrl && (
          <div style={{ position: "fixed", top: 20, right: 24, zIndex: 49, pointerEvents: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" style={{ maxHeight: 32, maxWidth: 110, objectFit: "contain", opacity: 0.85 }} />
          </div>
        )}

        {/* ── Circular progress — visible during playing ── */}
        <AnimatePresence>
          {state === "playing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", bottom: 24, right: 24, zIndex: 49 }}
            >
              <CircularProgress
                progress={progress}
                color={primaryColor}
                step={displayStep}
                total={inputFields.length}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, overflow: "hidden" }}>
          <AnimatePresence mode="wait" custom={direction}>

            {/* INTRO */}
            {state === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, filter: "blur(4px)" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "100%", maxWidth: 640,
                  padding: "0 32px",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0,
                }}
              >
                {/* Eyebrow */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  style={{
                    fontSize: 12, fontWeight: 600, letterSpacing: "0.14em",
                    textTransform: "uppercase", opacity: 0.35,
                    marginBottom: 20,
                  }}
                >
                  {inputFields.length} pergunta{inputFields.length !== 1 ? "s" : ""} · ~{Math.ceil(inputFields.length * 0.5)} min
                </motion.p>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    fontSize: "clamp(36px, 6vw, 56px)",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    letterSpacing: "-1px",
                    color: textColor,
                    marginBottom: 36,
                  }}
                >
                  {title}
                </motion.h1>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <button
                    onClick={handleStart}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "14px 28px",
                      borderRadius: 14,
                      background: primaryColor,
                      color: "#ffffff",
                      fontSize: 18, fontWeight: 700,
                      fontFamily: "inherit",
                      border: "none",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      boxShadow: `0 8px 28px rgba(${r},${g},${b},0.35)`,
                      letterSpacing: "-0.2px",
                      alignSelf: "flex-start",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 36px rgba(${r},${g},${b},0.5)`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 28px rgba(${r},${g},${b},0.35)`;
                    }}
                  >
                    Começar
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <p style={{ fontSize: 12, opacity: 0.25, letterSpacing: "0.02em" }}>
                    Pressione{" "}
                    <kbd style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>
                      Enter ↵
                    </kbd>{" "}
                    para iniciar
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* QUESTIONS */}
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
                accentRgb={[r, g, b]}
                textColor={textColor}
                formId={formId}
              />
            )}

            {/* SUBMITTING */}
            {state === "submitting" && (
              <motion.div key="submitting"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: "df-blob1 1.2s linear infinite" }}>
                  <circle cx="20" cy="20" r="16" stroke={primaryColor} strokeWidth="3" strokeOpacity="0.2"/>
                  <path d="M20 4a16 16 0 0116 16" stroke={primaryColor} strokeWidth="3" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.9s" repeatCount="indefinite"/>
                  </path>
                </svg>
                <p style={{ opacity: 0.4, fontSize: 16 }}>Enviando…</p>
              </motion.div>
            )}

            {/* DONE */}
            {state === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  maxWidth: 560, width: "100%", padding: "0 32px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  textAlign: "center", gap: 0,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                  style={{
                    width: 64, height: 64, borderRadius: "50%",
                    backgroundColor: primaryColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 24,
                    boxShadow: `0 8px 28px rgba(${r},${g},${b},0.4)`,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </motion.div>

                <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
                  {thankYouMessage}
                </h2>
                {redirectUrl && <p style={{ fontSize: 14, opacity: 0.4, marginTop: 8 }}>Redirecionando em instantes…</p>}
                {preview && <p style={{ fontSize: 12, opacity: 0.25, marginTop: 8 }}>(Modo preview — resposta não salva)</p>}
              </motion.div>
            )}

            {/* DISQUALIFIED */}
            {state === "disqualified" && (
              <motion.div key="disqualified"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: 560, width: "100%", padding: "0 32px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 28,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                    <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: 12 }}>
                  Obrigado pelo interesse!
                </h2>
                <p style={{ fontSize: 18, opacity: 0.5, lineHeight: 1.5 }}>
                  {disqualifyData?.message ?? "Agradecemos o seu contato. Entraremos em contato se tivermos uma oportunidade adequada."}
                </p>
                {disqualifyData?.url && (
                  <p style={{ fontSize: 12, opacity: 0.25, marginTop: 16 }}>Redirecionando em instantes…</p>
                )}
              </motion.div>
            )}

            {/* ERROR */}
            {state === "error" && (
              <motion.div key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: 560, width: "100%", padding: "0 32px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(239,68,68,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 28,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </div>
                <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: 12 }}>
                  Algo deu errado
                </h2>
                <p style={{ fontSize: 16, opacity: 0.45, marginBottom: 28 }}>
                  Não conseguimos enviar suas respostas. Tente novamente.
                </p>
                <button
                  onClick={() => setState("playing")}
                  style={{
                    padding: "12px 24px", borderRadius: 12,
                    background: primaryColor, color: "#fff",
                    fontSize: 16, fontWeight: 700, fontFamily: "inherit",
                    border: "none", cursor: "pointer",
                    boxShadow: `0 6px 20px rgba(${r},${g},${b},0.3)`,
                  }}
                >
                  Tentar novamente
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer minimal ── */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: "12px 24px",
          display: "flex", justifyContent: "flex-start",
        }}>
          <p style={{ fontSize: 11, opacity: 0.18, letterSpacing: "0.04em" }}>
            {preview ? "Preview · " : ""}Criado com DonForms
          </p>
        </div>
      </div>
    </>
  );
}
