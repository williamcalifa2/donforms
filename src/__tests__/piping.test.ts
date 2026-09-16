import { describe, it, expect } from "vitest";
import { interpolateVariables, getAvailablePipingVariables, getFirstName } from "@/lib/piping";
import type { FormField } from "@/types/database.types";

const mockFields: FormField[] = [
  {
    id: "f_name",
    type: "short_text",
    label: "Qual é o seu nome completo?",
    required: true,
  },
  {
    id: "f_company",
    type: "short_text",
    label: "Nome da empresa",
    required: true,
  },
  {
    id: "f_role",
    type: "multiple_choice",
    label: "Qual o seu cargo?",
    options: ["Fundador / CEO", "Marketing", "Vendas", "Outro"],
    required: true,
  },
  {
    id: "f_phone",
    type: "phone",
    label: "WhatsApp para contato",
    required: true,
  },
];

describe("Conversational Piping (interpolateVariables)", () => {
  it("interpola pelo label da pergunta", () => {
    const answers = { f_name: "Lucas Silva" };
    const template = "Prazer em te conhecer, {{Qual é o seu nome completo?}}! Tudo bem?";
    expect(interpolateVariables(template, mockFields, answers)).toBe(
      "Prazer em te conhecer, Lucas Silva! Tudo bem?"
    );
  });

  it("interpola por palavra-chave do label (match flexível)", () => {
    const answers = { f_name: "Mariana Oliveira" };
    const template = "Olá {{nome}}, seja bem-vinda!";
    expect(interpolateVariables(template, mockFields, answers)).toBe(
      "Olá Mariana Oliveira, seja bem-vinda!"
    );
  });

  it("interpola extraindo apenas o primeiro nome com .primeiro", () => {
    const answers = { f_name: "Rodrigo Carvalho Mendes" };
    const template = "Fala, {{nome.primeiro}}! Como podemos ajudar a {{empresa}}?";
    const answersWithCompany = { ...answers, f_company: "Don Digital" };
    expect(interpolateVariables(template, mockFields, answersWithCompany)).toBe(
      "Fala, Rodrigo! Como podemos ajudar a Don Digital?"
    );
  });

  it("interpola pelo índice da pergunta (1-indexed)", () => {
    const answers = { f_name: "Beatriz" };
    const template = "Obrigado, {{1}}!";
    expect(interpolateVariables(template, mockFields, answers)).toBe("Obrigado, Beatriz!");

    const templatePt = "Obrigado, {{pergunta 1}}!";
    expect(interpolateVariables(templatePt, mockFields, answers)).toBe("Obrigado, Beatriz!");
  });

  it("interpola pelo ID exato do campo", () => {
    const answers = { f_company: "Acme Corp" };
    const template = "Vamos analisar a {{f_company}} em instantes.";
    expect(interpolateVariables(template, mockFields, answers)).toBe(
      "Vamos analisar a Acme Corp em instantes."
    );
  });

  it("usa fallback quando a pergunta ainda não foi respondida", () => {
    const answers = {};
    const template = "Olá {{nome|amigo}}, preparamos algo especial para a {{empresa|sua empresa}}.";
    expect(interpolateVariables(template, mockFields, answers)).toBe(
      "Olá amigo, preparamos algo especial para a sua empresa."
    );
  });

  it("remove marcador vazio caso não tenha resposta e sem fallback", () => {
    const answers = {};
    const template = "Olá {{nome}}! Seja bem-vindo.";
    expect(interpolateVariables(template, mockFields, answers)).toBe("Olá ! Seja bem-vindo.");
  });

  it("exibe marcador amigável em modo preview de editor", () => {
    const answers = {};
    const template = "Olá {{nome}}!";
    expect(interpolateVariables(template, mockFields, answers, { isEditorPreview: true })).toBe(
      "Olá @{nome}!"
    );
  });

  it("interpola arrays (ex: múltipla escolha)", () => {
    const answers = { f_role: "Fundador / CEO" };
    const template = "Legal saber que você atua como {{cargo}}.";
    expect(interpolateVariables(template, mockFields, answers)).toBe(
      "Legal saber que você atua como Fundador / CEO."
    );
  });
});

describe("getAvailablePipingVariables", () => {
  it("retorna apenas campos anteriores ao índice atual", () => {
    const varsForField2 = getAvailablePipingVariables(mockFields, 2);
    expect(varsForField2).toHaveLength(2);
    expect(varsForField2[0].label).toBe("Qual é o seu nome completo?");
    expect(varsForField2[1].label).toBe("Nome da empresa");
  });

  it("não retorna nenhum campo para o primeiro slide", () => {
    const varsForField0 = getAvailablePipingVariables(mockFields, 0);
    expect(varsForField0).toHaveLength(0);
  });
});

describe("getFirstName helper", () => {
  it("extrai primeiro nome corretamente", () => {
    expect(getFirstName("Lucas Silva Santos")).toBe("Lucas");
    expect(getFirstName("Ana")).toBe("Ana");
    expect(getFirstName("")).toBe("");
  });
});
