"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { extractUtms } from "@/lib/utils";
import { QuestionSlide } from "./QuestionSlide";
import type { FormField, FormSettings } from "@/types/database.types";

type PlayerState = "intro" | "playing" | "submitting" | "done" | "error";

interface Props {
  formId: string;
  title: string;
  fields: FormField[];
  settings: FormSettings;
}

export function FormPlayer({ formId, title, fields, settings }: Props) {
  const [state, setState] = useState<PlayerState>("intro");
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldError, setFieldError] = useState<string | undefined>();

  const field = fields[current];
  const progress = state === "done" ? 100 : Math.round((current / fields.length) * 100);
  const { primaryColor, bgColor, thankYouMessage, redirectUrl } = settings;

  // ─── Keyboard: Enter = start quando na intro ─────────────────────────────
  useEffect(() => {
    if (state !== "intro") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") setState("playing");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  // ─── Validação ────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    if (!field.required) return true;
    const val = (answers[field.id] ?? "").trim();
    if (!val) {
      setFieldError("Este campo é obrigatório.");
      return false;
    }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setFieldError("Digite um email válido.");
      return false;
    }
    return true;
  }, [field, answers]);

  // ─── Próxima pergunta / Submit ────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    setFieldError(undefined);
    if (!validate()) return;

    if (current < fields.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
      return;
    }

    // Último campo → submit
    setState("submitting");

    try {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const metadata = {
        ...extractUtms(url),
        referrer: document.referrer || undefined,
        user_agent: navigator.userAgent,
      };

      // Cast para any — tabela submissions é pública (anon insert via RLS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("submissions")
        .insert({ form_id: formId, answers, metadata });

      if (error) throw new Error(error.message);

      setState("done");

      if (redirectUrl) {
        setTimeout(() => { window.location.href = redirectUrl; }, 2500);
      }
    } catch {
      setState("error");
    }
  }, [current, fields.length, validate, formId, answers, redirectUrl]);

  // ─── Pergunta anterior ────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    if (current === 0) return;
    setFieldError(undefined);
    setDirection(-1);
    setCurrent((c) => c - 1);
  }, [current]);

  // ─── Atualiza resposta do campo atual ────────────────────────────────────
  const handleChange = useCallback((value: string) => {
    setFieldError(undefined);
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
  }, [field.id]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-500"
      style={{ backgroundColor: bgColor, color: isDark(bgColor) ? "#ffffff" : "#1a1a1a" }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-current/10">
        <motion.div
          className="h-full transition-all"
          style={{ backgroundColor: primaryColor }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Player body */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-16 px-4">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ── Intro ── */}
          {state === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-6"
            >
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{title}</h1>
              <p className="opacity-50 text-sm">
                {fields.length} pergunta{fields.length !== 1 ? "s" : ""} · ~{Math.ceil(fields.length * 0.5)} min
              </p>
              <button
                onClick={() => setState("playing")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                Começar
                <span>→</span>
              </button>
              <p className="text-xs opacity-30">
                Pressione <kbd className="font-mono bg-current/10 px-1 rounded">Enter ↵</kbd> para iniciar
              </p>
            </motion.div>
          )}

          {/* ── Perguntas ── */}
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
              isLast={current === fields.length - 1}
              primaryColor={primaryColor}
              direction={direction}
              error={fieldError}
            />
          )}

          {/* ── Enviando ── */}
          {state === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <svg
                className="h-10 w-10 mx-auto animate-spin opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="opacity-50 text-sm">Enviando…</p>
            </motion.div>
          )}

          {/* ── Obrigado ── */}
          {state === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-5"
            >
              {/* Check animado */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  className="h-8 w-8">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-semibold">{thankYouMessage}</h2>
              {redirectUrl && (
                <p className="text-sm opacity-40">Redirecionando em instantes…</p>
              )}
            </motion.div>
          )}

          {/* ── Erro ── */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-xl mx-auto px-6 text-center space-y-5"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="h-8 w-8">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold">Algo deu errado</h2>
              <p className="opacity-50 text-sm">Não conseguimos enviar suas respostas. Tente novamente.</p>
              <button
                onClick={() => setState("playing")}
                className="px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Tentar novamente
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Rodapé */}
      <footer className="pb-4 text-center">
        <p className="text-xs opacity-20">
          Criado com DonForms
        </p>
      </footer>
    </div>
  );
}

// ─── Helper: detecta fundo escuro para escolher cor do texto ─────────────────
function isDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Luminância relativa (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
