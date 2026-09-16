import type { FormField } from "@/types/database.types";

/**
 * Normaliza strings para comparação flexível (remove acentos, pontuação e caixa alta)
 */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca o valor da resposta de um campo a partir de uma referência flexível:
 * 1. Por ID exato do campo
 * 2. Por número da pergunta (ex: "1", "q1", "pergunta 1")
 * 3. Por label do campo (exato ou parcial: "nome" acha "Qual seu nome completo?")
 * 4. Por tipo do campo (ex: "email" acha o campo do tipo email)
 */
export function getAnswerForRef(
  rawRef: string,
  fields: FormField[],
  answers: Record<string, unknown> = {}
): string | null {
  if (!rawRef) return null;
  const cleanRef = normalize(rawRef);

  // 1. Por ID exato do campo
  const byId = fields.find((f) => normalize(f.id) === cleanRef);
  if (byId && answers[byId.id] != null && String(answers[byId.id]).trim() !== "") {
    return formatAnswerValue(answers[byId.id]);
  }

  // 2. Por número da pergunta (ex: "1", "q1", "pergunta 1")
  const numMatch = cleanRef.match(/^(?:pergunta\s*|q\s*|p\s*)?(\d+)$/);
  if (numMatch) {
    const questionIndex = parseInt(numMatch[1], 10) - 1;
    const inputFields = fields.filter((f) => f.type !== "statement");
    const targetField = inputFields[questionIndex];
    if (targetField && answers[targetField.id] != null && String(answers[targetField.id]).trim() !== "") {
      return formatAnswerValue(answers[targetField.id]);
    }
  }

  // 3. Por label do campo (match exato primeiro, depois parcial)
  const byExactLabel = fields.find((f) => normalize(f.label) === cleanRef);
  if (byExactLabel && answers[byExactLabel.id] != null && String(answers[byExactLabel.id]).trim() !== "") {
    return formatAnswerValue(answers[byExactLabel.id]);
  }

  const byPartialLabel = fields.find((f) => {
    const normalizedLabel = normalize(f.label);
    return normalizedLabel.includes(cleanRef) || cleanRef.includes(normalizedLabel);
  });
  if (byPartialLabel && answers[byPartialLabel.id] != null && String(answers[byPartialLabel.id]).trim() !== "") {
    return formatAnswerValue(answers[byPartialLabel.id]);
  }

  // 4. Por tipo do campo (ex: "email", "phone", "telefone")
  const typeMap: Record<string, string> = {
    telefone: "phone",
    celular: "phone",
    whatsapp: "phone",
    nome: "short_text",
  };
  const targetType = typeMap[cleanRef] || cleanRef;
  const byType = fields.find((f) => f.type === targetType);
  if (byType && answers[byType.id] != null && String(answers[byType.id]).trim() !== "") {
    return formatAnswerValue(answers[byType.id]);
  }

  return null;
}

/**
 * Formata valores complexos (arrays de múltipla escolha, objetos) em texto legível
 */
function formatAnswerValue(val: unknown): string {
  if (Array.isArray(val)) {
    return val.filter(Boolean).join(", ");
  }
  if (typeof val === "boolean") {
    return val ? "Sim" : "Não";
  }
  return String(val ?? "").trim();
}

/**
 * Extrai apenas o primeiro nome se a string parecer um nome próprio
 */
export function getFirstName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

export interface InterpolateOptions {
  /** Se verdadeiro (ex: no editor), mantém marcadores visuais caso a resposta não exista */
  isEditorPreview?: boolean;
}

/**
 * Substitui tags de variáveis no formato:
 * - {{nome}}
 * - {{nome|fallback}}
 * - {{nome.primeiro}} ou {{nome.first}}
 * - {{1}} ou {{pergunta 1}}
 * - @nome
 */
export function interpolateVariables(
  template: string | null | undefined,
  fields: FormField[] = [],
  answers: Record<string, unknown> = {},
  options: InterpolateOptions = {}
): string {
  if (!template) return "";

  // 1. Substitui padrão padrão chaves duplas: {{campo}} ou {{campo|fallback}}
  let result = template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawExpression) => {
    const parts = rawExpression.split("|");
    const expression = parts[0].trim();
    const fallback = parts.length > 1 ? parts.slice(1).join("|").trim() : "";

    const isFirstOnly =
      expression.endsWith(".primeiro") ||
      expression.endsWith(".first") ||
      expression.endsWith(":primeiro") ||
      expression.endsWith(":first");

    const cleanRef = expression.replace(/(\.first|\.primeiro|:first|:primeiro)$/i, "");

    const answer = getAnswerForRef(cleanRef, fields, answers);

    if (answer) {
      return isFirstOnly ? getFirstName(answer) : answer;
    }

    if (options.isEditorPreview) {
      return fallback || `@{${cleanRef}}`;
    }

    return fallback;
  });

  // 2. Substitui menções simples com @ (quando seguidas de palavras válidas de campos anteriores)
  // Ex: "Prazer, @Nome! Qual o seu cargo?"
  if (fields.length > 0 && result.includes("@")) {
    for (const field of fields) {
      if (!field.label) continue;
      const labelWord = field.label.trim().split(/\s+/)[0];
      if (!labelWord || labelWord.length < 2) continue;

      const escapedWord = labelWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const atRegex = new RegExp(`@${escapedWord}\\b`, "gi");

      if (atRegex.test(result)) {
        const answer = answers[field.id] != null ? formatAnswerValue(answers[field.id]) : null;
        if (answer) {
          result = result.replace(atRegex, answer);
        } else if (!options.isEditorPreview) {
          // Em produção, se não respondeu ainda, remove o @
          result = result.replace(atRegex, "");
        }
      }
    }
  }

  return result;
}

/**
 * Retorna as variáveis disponíveis para um determinado campo (campos anteriores a ele)
 */
export function getAvailablePipingVariables(
  fields: FormField[],
  currentIndex: number
): { id: string; label: string; variableKey: string; previewBadge: string }[] {
  return fields
    .slice(0, currentIndex)
    .filter((f) => f.type !== "statement" && f.label?.trim())
    .map((f, i) => {
      // Cria uma chave curta e amigável
      const simpleName = normalize(f.label)
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 20);

      return {
        id: f.id,
        label: f.label,
        variableKey: `{{${f.label}}}`,
        previewBadge: `@${f.label || `Pergunta ${i + 1}`}`,
      };
    });
}
