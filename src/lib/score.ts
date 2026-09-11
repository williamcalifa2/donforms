import type { FormField } from "@/types/database.types";

/**
 * Verifica se uma submissão é MQL baseado no campo marcado com isMqlField.
 * Busca o campo com isMqlField: true e avalia a resposta segundo o tipo.
 */
export function isMqlByField(
  answers: Record<string, string | string[] | number>,
  fields: FormField[]
): boolean {
  const mqlField = fields.find(f => f.isMqlField);
  if (!mqlField) return false;

  const raw = answers[mqlField.id];
  if (raw == null || raw === "") return false;

  // Múltipla escolha: verificar opções qualificadoras
  if (mqlField.type === "multiple_choice") {
    const qualifying = mqlField.mqlQualifyingOptions ?? [];
    if (qualifying.length === 0) return false;
    return qualifying.includes(String(raw));
  }

  // Yes/No
  if (mqlField.type === "yes_no") {
    const isYes = ["sim", "yes", "true"].includes(String(raw).toLowerCase());
    return mqlField.mqlYesQualifies !== false ? isYes : !isYes;
  }

  // Number / text: parse como número e comparar
  const str = String(raw).replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(str);
  if (isNaN(num)) return false;
  return num >= (mqlField.mqlMinValue ?? 100000);
}
