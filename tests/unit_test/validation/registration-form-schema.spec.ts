import { describe, expect, it } from "vitest";
import { buildSchema } from "@/lib/validation/registration-form-schema";
import type { PublicFormField } from "@/lib/api/types";

function selectField(overrides: Partial<PublicFormField> = {}): PublicFormField {
  return {
    id: "f1",
    label: "Camiseta",
    type: "select",
    required: true,
    options: ["P", "M", "G"],
    order: 0,
    ...overrides,
  };
}

function multiselectField(overrides: Partial<PublicFormField> = {}): PublicFormField {
  return {
    id: "f2",
    label: "Interesses",
    type: "multiselect",
    required: true,
    options: ["A", "B", "C"],
    order: 0,
    ...overrides,
  };
}

describe("buildSchema — select", () => {
  it("rejeita valor fora das opções configuradas", () => {
    const schema = buildSchema([selectField()]);
    const result = schema.safeParse({ Camiseta: "XG" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Opção inválida");
    }
  });

  it("aceita valor presente nas opções configuradas", () => {
    const schema = buildSchema([selectField()]);
    expect(schema.safeParse({ Camiseta: "M" }).success).toBe(true);
  });

  it("campo opcional aceita vazio sem cair na checagem de opções", () => {
    const schema = buildSchema([selectField({ required: false })]);
    expect(schema.safeParse({ Camiseta: "" }).success).toBe(true);
  });

  it("obrigatório rejeita vazio com 'Campo obrigatório', antes de checar opções", () => {
    const schema = buildSchema([selectField()]);
    const result = schema.safeParse({ Camiseta: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Campo obrigatório");
    }
  });
});

function instagramField(overrides: Partial<PublicFormField> = {}): PublicFormField {
  return {
    id: "f3",
    label: "Instagram",
    type: "instagram",
    required: true,
    options: [],
    order: 0,
    ...overrides,
  };
}

describe("buildSchema — instagram", () => {
  it("aceita @usuario sem exigir URL", () => {
    const schema = buildSchema([instagramField()]);
    expect(schema.safeParse({ Instagram: "@ruan.sanchez" }).success).toBe(true);
  });

  it("rejeita valor com espaços ou caracteres inválidos", () => {
    const schema = buildSchema([instagramField()]);
    expect(schema.safeParse({ Instagram: "https://instagram.com/x" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ Instagram: "usuario invalido" }).success).toBe(false);
  });
});

describe("buildSchema — multiselect", () => {
  it("rejeita quando algum valor selecionado não está nas opções", () => {
    const schema = buildSchema([multiselectField()]);
    const result = schema.safeParse({ Interesses: ["A", "Z"] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Opção inválida");
    }
  });

  it("aceita quando todos os valores selecionados estão nas opções", () => {
    const schema = buildSchema([multiselectField()]);
    expect(schema.safeParse({ Interesses: ["A", "C"] }).success).toBe(true);
  });

  it("obrigatório ainda exige ao menos uma opção selecionada", () => {
    const schema = buildSchema([multiselectField()]);
    const result = schema.safeParse({ Interesses: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione ao menos uma opção");
    }
  });
});
