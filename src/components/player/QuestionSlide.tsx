"use client";

import { motion } from "framer-motion";
import { ShortTextField } from "./fields/ShortTextField";
import { LongTextField } from "./fields/LongTextField";
import { EmailField } from "./fields/EmailField";
import { NumberField } from "./fields/NumberField";
import { MultipleChoiceField } from "./fields/MultipleChoiceField";
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
  direction: 1 | -1; // 1 = avançando, -1 = voltando
  error?: string;
}

const variants = {
  enter: (dir: number) => ({
    y: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function QuestionSlide({
  field,
  index,
  total,
  value,
  onChange,
  onNext,
  onPrev,
  isLast,
  primaryColor,
  direction,
  error,
}: Props) {
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
      {/* Número da pergunta */}
      <p className="text-sm opacity-50 mb-3 flex items-center gap-2">
        <span className="font-semibold">{index + 1}</span>
        <span>→</span>
        <span className="opacity-70">de {total}</span>
      </p>

      {/* Label */}
      <h2 className="text-2xl sm:text-3xl font-semibold leading-snug mb-6">
        {field.label}
        {field.required && (
          <span className="text-red-400 ml-1 text-xl">*</span>
        )}
      </h2>

      {/* Campo */}
      <div className="mb-6">
        {field.type === "short_text" && (
          <ShortTextField
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            primaryColor={primaryColor}
            onEnter={onNext}
          />
        )}
        {field.type === "long_text" && (
          <LongTextField
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            onEnter={onNext}
          />
        )}
        {field.type === "email" && (
          <EmailField
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            onEnter={onNext}
          />
        )}
        {field.type === "number" && (
          <NumberField
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            onEnter={onNext}
          />
        )}
        {field.type === "multiple_choice" && (
          <MultipleChoiceField
            value={value}
            onChange={onChange}
            options={field.options ?? []}
            primaryColor={primaryColor}
            onEnter={onNext}
          />
        )}
      </div>

      {/* Erro de validação */}
      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {/* Botões de navegação */}
      <div className="flex items-center gap-3">
        {field.type !== "multiple_choice" && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            {isLast ? "Enviar" : "OK"}
            <span className="text-xs opacity-75">
              {isLast ? "✓" : "↵"}
            </span>
          </button>
        )}

        {index > 0 && (
          <button
            onClick={onPrev}
            className="text-sm opacity-40 hover:opacity-70 transition-opacity px-2 py-1"
          >
            ← Voltar
          </button>
        )}
      </div>

      {/* Hint teclado (não-mobile) */}
      {field.type !== "multiple_choice" && field.type !== "long_text" && (
        <p className="text-xs opacity-30 mt-4">
          Pressione <kbd className="font-mono bg-current/10 px-1 rounded">Enter ↵</kbd> para avançar
        </p>
      )}
    </motion.div>
  );
}
