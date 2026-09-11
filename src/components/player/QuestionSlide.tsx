"use client";

import { motion } from "framer-motion";
import { ShortTextField } from "./fields/ShortTextField";
import { LongTextField } from "./fields/LongTextField";
import { EmailField } from "./fields/EmailField";
import { NumberField } from "./fields/NumberField";
import { MultipleChoiceField } from "./fields/MultipleChoiceField";
import { YesNoField } from "./fields/YesNoField";
import { RatingField } from "./fields/RatingField";
import { PhoneField } from "./fields/PhoneField";
import { DateField } from "./fields/DateField";
import type { FormField } from "@/types/database.types";

interface Props {
  field: FormField;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
  primaryColor: string;
  direction: 1 | -1;
  error?: string;
}

const variants = {
  enter: (dir: number) => ({ y: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: (dir: number) => ({
    y: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// Tipos que avançam automaticamente (sem botão OK)
const AUTO_ADVANCE_TYPES = new Set(["multiple_choice", "yes_no"]);
// Tipos que não têm input (sem botão OK)
const NO_OK_TYPES = new Set(["statement"]);

export function QuestionSlide({
  field, index, total, value, onChange, onNext, onPrev, isLast, primaryColor, direction, error,
}: Props) {
  const isStatement = field.type === "statement";
  const showOK = !AUTO_ADVANCE_TYPES.has(field.type) && !NO_OK_TYPES.has(field.type);

  return (
    <motion.div
      key={field.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full max-w-xl mx-auto px-6"
    >
      {/* Badge numérico — ocultar em statement */}
      {!isStatement && (
        <div className="flex items-center gap-2 mb-4">
          <span
            style={{
              background: primaryColor,
              color: "#000",
              fontSize: "11px",
              fontWeight: 700,
              width: "16px",
              height: "19px",
              borderRadius: "5px 3px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              lineHeight: 1,
              letterSpacing: 0,
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            {index + 1}
          </span>
          <span style={{ fontSize: "13px", opacity: 0.35, fontWeight: 400 }}>→</span>
        </div>
      )}

      {/* Label */}
      <h2
        style={{
          fontSize: isStatement ? "32px" : "26px",
          fontWeight: 700,
          lineHeight: isStatement ? "1.2" : "34px",
          letterSpacing: "-0.5px",
          marginBottom: "8px",
          color: "#ffffff",
        }}
      >
        {field.label}
        {!isStatement && field.required && (
          <span style={{ color: "#ffffff", marginLeft: "4px", fontSize: "20px" }}>*</span>
        )}
      </h2>

      {/* Subtítulo / Descrição */}
      {field.description && (
        <p style={{ fontSize: "16px", opacity: 0.5, marginBottom: "28px", lineHeight: "1.5", color: "#ffffff" }}>
          {field.description}
        </p>
      )}

      {!field.description && <div style={{ marginBottom: "28px" }} />}

      {/* Campo */}
      {!isStatement && (
        <div className="mb-8">
          {field.type === "short_text" && (
            <ShortTextField value={value} onChange={onChange}
              placeholder={field.placeholder} primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "long_text" && (
            <LongTextField value={value} onChange={onChange}
              placeholder={field.placeholder} onEnter={onNext} />
          )}
          {field.type === "email" && (
            <EmailField value={value} onChange={onChange}
              placeholder={field.placeholder} onEnter={onNext} />
          )}
          {field.type === "number" && (
            <NumberField value={value} onChange={onChange}
              placeholder={field.placeholder} min={field.min} max={field.max} onEnter={onNext} />
          )}
          {field.type === "phone" && (
            <PhoneField value={value} onChange={onChange}
              placeholder={field.placeholder} onEnter={onNext} primaryColor={primaryColor} />
          )}
          {field.type === "date" && (
            <DateField value={value} onChange={onChange} onEnter={onNext} />
          )}
          {field.type === "multiple_choice" && (
            <MultipleChoiceField value={value} onChange={onChange}
              options={field.options ?? []} primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "yes_no" && (
            <YesNoField value={value} onChange={onChange}
              primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "rating" && (
            <RatingField value={value} onChange={onChange}
              primaryColor={primaryColor} scale={field.scale ?? 5} />
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "12px" }}>{error}</p>
      )}

      {/* Botões */}
      <div className="flex items-center gap-2">
        {/* OK / Continuar / Enviar */}
        {(showOK || isStatement) && (
          <button
            onClick={onNext}
            style={{
              background: "rgba(0,0,0,0.3)",
              color: "#F2F3F8",
              borderRadius: "32px",
              padding: "8px 14px",
              fontSize: "18px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: `1px solid ${primaryColor}33`,
              transition: "all 0.15s",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.5)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${primaryColor}66`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.3)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${primaryColor}33`;
            }}
          >
            {isStatement ? "Continuar" : isLast ? "Enviar" : "OK"}
            <span style={{ fontSize: "14px", opacity: 0.6 }}>
              {isStatement ? "→" : isLast ? "✓" : "↵"}
            </span>
          </button>
        )}

        {/* Rating: botão OK separado */}
        {field.type === "rating" && value && (
          <button
            onClick={onNext}
            style={{
              background: "rgba(0,0,0,0.3)",
              color: "#F2F3F8",
              borderRadius: "32px",
              padding: "8px 14px",
              fontSize: "18px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: `1px solid ${primaryColor}33`,
              transition: "all 0.15s",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isLast ? "Enviar ✓" : "OK ↵"}
          </button>
        )}

        {/* Par de setas de navegação */}
        <div className="flex items-center ml-2">
          {/* Seta: voltar */}
          <button
            onClick={onPrev}
            disabled={index === 0}
            title="Voltar"
            style={{
              background: index === 0 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.3)",
              border: `1px solid ${primaryColor}22`,
              borderRight: "none",
              borderRadius: "32px 2px 2px 32px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: index === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              opacity: index === 0 ? 0.3 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8l4-4" stroke="#CBCDE5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Seta: avançar */}
          <button
            onClick={onNext}
            title="Próxima"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${primaryColor}22`,
              borderRadius: "2px 32px 32px 2px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4l4 4-4 4" stroke="#CBCDE5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hint teclado */}
      {showOK && field.type !== "long_text" && (
        <p style={{ fontSize: "12px", opacity: 0.25, marginTop: "16px" }}>
          Pressione <kbd style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: "4px" }}>Enter ↵</kbd> para avançar
        </p>
      )}
    </motion.div>
  );
}
