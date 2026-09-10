import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes sem conflito */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Gera ID curto para campos de formulário (client-side) */
export function generateFieldId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Extrai UTMs da URL atual */
export function extractUtms(url: URL): Record<string, string> {
  const utmParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  return Object.fromEntries(
    utmParams
      .filter((p) => url.searchParams.has(p))
      .map((p) => [p, url.searchParams.get(p)!])
  );
}

/** Formata data ISO para exibição (pt-BR) */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Trunca string mantendo palavras inteiras */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
