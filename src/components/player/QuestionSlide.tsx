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
  accentRgb: [number, number, number];
  textColor: string;
}

const variants = {
  enter: (dir: number) => ({
    y: dir > 0 ? 80 : -80,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -80 : 80,
    opacity: 0,
    filter: "blur(6px)",
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as const },
  }),
};

const AUTO_ADVANCE_TYPES = new Set(["multiple_choice", "yes_no"]);
const NO_OK_TYPES = new Set(["statement"]);

export function QuestionSlide({
  field, index, value, onChange, onNext, onPrev, isLast,
  primaryColor, direction, error, accentRgb, textColor,
}: Props) {
  const isStatement = field.type === "statement";
  const showOK = !AUTO_ADVANCE_TYPES.has(field.type) && !NO_OK_TYPES.has(field.type);
  const [r, g, b] = accentRgb;

  return (
    <motion.div
      key={field.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{
        width: "100%",
        maxWidth: 680,
        padding: "0 32px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Step indicator */}
      {!isStatement && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              background: primaryColor,
              color: "#000",
              fontSize: 11, fontWeight: 800,
              width: 22, height: 22,
              borderRadius: "6px 3px",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              letterSpacing: 0, lineHeight: 1,
              fontFamily: "inherit",
              boxShadow: `0 2px 8px rgba(${r},${g},${b},0.4)`,
            }}
          >
            {index + 1}
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke={textColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3"/>
          </svg>
        </motion.div>
      )}

      {/* Label */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: [0.22,1,0.36,1] }}
        style={{
          fontSize: isStatement ? "clamp(30px, 5vw, 48px)" : "clamp(24px, 4vw, 38px)",
          fontWeight: 800,
          lineHeight: isStatement ? 1.15 : 1.2,
          letterSpacing: "-0.5px",
          marginBottom: 10,
          color: textColor,
        }}
      >
        {field.label}
        {!isStatement && field.required && (
          <span style={{ color: primaryColor, marginLeft: 4, fontSize: "0.6em", verticalAlign: "super", opacity: 0.8 }}>*</span>
        )}
      </motion.h2>

      {/* Description */}
      {field.description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.35 }}
          style={{ fontSize: 17, lineHeight: 1.55, marginBottom: 32, color: textColor, opacity: 0.45 }}
        >
          {field.description}
        </motion.p>
      )}
      {!field.description && <div style={{ marginBottom: 28 }} />}

      {/* Field input */}
      {!isStatement && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          style={{ marginBottom: error ? 10 : 28 }}
        >
          {field.type === "short_text" && (
            <ShortTextField value={value} onChange={onChange} placeholder={field.placeholder} primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "long_text" && (
            <LongTextField value={value} onChange={onChange} placeholder={field.placeholder} onEnter={onNext} />
          )}
          {field.type === "email" && (
            <EmailField value={value} onChange={onChange} placeholder={field.placeholder} onEnter={onNext} />
          )}
          {field.type === "number" && (
            <NumberField value={value} onChange={onChange} placeholder={field.placeholder} min={field.min} max={field.max} onEnter={onNext} />
          )}
          {field.type === "phone" && (
            <PhoneField value={value} onChange={onChange} placeholder={field.placeholder} onEnter={onNext} primaryColor={primaryColor} />
          )}
          {field.type === "date" && (
            <DateField value={value} onChange={onChange} onEnter={onNext} />
          )}
          {field.type === "multiple_choice" && (
            <MultipleChoiceField value={value} onChange={onChange} options={field.options ?? []} primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "yes_no" && (
            <YesNoField value={value} onChange={onChange} primaryColor={primaryColor} onEnter={onNext} />
          )}
          {field.type === "rating" && (
            <RatingField value={value} onChange={onChange} primaryColor={primaryColor} scale={field.scale ?? 5} />
          )}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 500, marginBottom: 16 }}
        >
          {error}
        </motion.p>
      )}

      {/* Action row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        {/* OK / Continue / Send button */}
        {(showOK || isStatement) && (
          <button
            onClick={onNext}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: primaryColor,
              color: "#ffffff",
              fontSize: 14, fontWeight: 700,
              fontFamily: "'Darker Grotesque', sans-serif",
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.2px",
              transition: "transform 0.12s, box-shadow 0.12s",
              boxShadow: `0 4px 16px rgba(${r},${g},${b},0.35)`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 24px rgba(${r},${g},${b},0.5)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px rgba(${r},${g},${b},0.35)`;
            }}
          >
            {isStatement ? "Continuar" : isLast ? "Enviar" : "OK"}
            <span style={{ fontSize: 13, opacity: 0.85 }}>
              {isStatement ? "→" : isLast ? "✓" : "↵"}
            </span>
          </button>
        )}

        {/* Rating OK */}
        {field.type === "rating" && value && (
          <button
            onClick={onNext}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 8,
              background: primaryColor, color: "#fff",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              border: "none", cursor: "pointer",
              boxShadow: `0 4px 16px rgba(${r},${g},${b},0.35)`,
            }}
          >
            {isLast ? "Enviar ✓" : "OK ↵"}
          </button>
        )}

        {/* Nav arrows — prev / next */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
          <button
            onClick={onPrev}
            disabled={index === 0}
            title="Voltar"
            style={{
              width: 36, height: 36,
              borderRadius: "8px 4px 4px 8px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: index === 0 ? "not-allowed" : "pointer",
              opacity: index === 0 ? 0.25 : 0.7,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { if (index > 0) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            onMouseLeave={e => { if (index > 0) (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onNext}
            title="Próxima"
            style={{
              width: 36, height: 36,
              borderRadius: "4px 8px 8px 4px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", opacity: 0.7,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Keyboard hint */}
      {showOK && field.type !== "long_text" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ fontSize: 11, opacity: 0.22, marginTop: 14, letterSpacing: "0.02em" }}
        >
          Pressione{" "}
          <kbd style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "1px 5px", borderRadius: 4 }}>
            Enter ↵
          </kbd>{" "}
          para avançar
        </motion.p>
      )}
    </motion.div>
  );
}
