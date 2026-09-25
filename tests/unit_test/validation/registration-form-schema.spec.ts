import { describe, expect, it } from "vitest";
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";
import { fieldKey } from "@/lib/api/public";
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
    const result = schema.safeParse({ [fieldKey({ id: "f1" })]: "XG" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Opção inválida");
    }
  });

  it("aceita valor presente nas opções configuradas", () => {
    const schema = buildSchema([selectField()]);
    expect(schema.safeParse({ [fieldKey({ id: "f1" })]: "M" }).success).toBe(true);
  });

  it("campo opcional aceita vazio sem cair na checagem de opções", () => {
    const schema = buildSchema([selectField({ required: false })]);
    expect(schema.safeParse({ [fieldKey({ id: "f1" })]: "" }).success).toBe(true);
  });

  it("obrigatório rejeita vazio com 'Campo obrigatório', antes de checar opções", () => {
    const schema = buildSchema([selectField()]);
    const result = schema.safeParse({ [fieldKey({ id: "f1" })]: "" });
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
    expect(schema.safeParse({ [fieldKey({ id: "f3" })]: "@ruan.sanchez" }).success).toBe(
      true,
    );
  });

  it("rejeita valor com espaços ou caracteres inválidos", () => {
    const schema = buildSchema([instagramField()]);
    expect(
      schema.safeParse({ [fieldKey({ id: "f3" })]: "https://instagram.com/x" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ [fieldKey({ id: "f3" })]: "usuario invalido" }).success,
    ).toBe(false);
  });
});

describe("buildSchema — multiselect", () => {
  it("rejeita quando algum valor selecionado não está nas opções", () => {
    const schema = buildSchema([multiselectField()]);
    const result = schema.safeParse({ [fieldKey({ id: "f2" })]: ["A", "Z"] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Opção inválida");
    }
  });

  it("aceita quando todos os valores selecionados estão nas opções", () => {
    const schema = buildSchema([multiselectField()]);
    expect(schema.safeParse({ [fieldKey({ id: "f2" })]: ["A", "C"] }).success).toBe(true);
  });

  it("obrigatório ainda exige ao menos uma opção selecionada", () => {
    const schema = buildSchema([multiselectField()]);
    const result = schema.safeParse({ [fieldKey({ id: "f2" })]: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione ao menos uma opção");
    }
  });
});

describe("buildSchema — document", () => {
  const documentField: PublicFormField = {
    id: "doc-1",
    label: "Documentos",
    type: "document",
    required: true,
    options: { maxFiles: 3 },
    order: 0,
  };
  const reference = {
    url: "https://cdn.example.com/file.pdf",
    name: "file.pdf",
    mimetype: "application/pdf",
    size: 123,
  };

  it("exige ao menos um arquivo quando obrigatório e respeita maxFiles", () => {
    const schema = buildSchema([documentField]);
    const key = fieldKey(documentField);
    expect(schema.safeParse({ [key]: [] }).success).toBe(false);
    expect(schema.safeParse({ [key]: [reference, reference, reference] }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ [key]: [reference, reference, reference, reference] }).success,
    ).toBe(false);
  });

  it("campo opcional aceita lista vazia e o default sempre é lista", () => {
    const optional = { ...documentField, required: false };
    const key = fieldKey(optional);
    expect(buildSchema([optional]).safeParse({ [key]: [] }).success).toBe(true);
    expect(defaultValues([optional])[key]).toEqual([]);
  });
});

function dateAutomationField(overrides: Partial<PublicFormField> = {}): PublicFormField {
  return {
    id: "f4",
    label: "Data do lembrete",
    type: "on_date_automation_field",
    required: true,
    options: null,
    order: 0,
    ...overrides,
  };
}

describe("buildSchema — anonymous form (sem campo phone)", () => {
  it("formulário anônimo não inclui o telefone entre os campos visíveis, então o schema não o exige", () => {
    // A filtragem de campos "phone" para formulário anônimo acontece no componente
    // (RegistrationForm), antes de chamar buildSchema — aqui simulamos a lista já filtrada.
    const schema = buildSchema([selectField()]);
    expect(schema.safeParse({ [fieldKey({ id: "f1" })]: "M" }).success).toBe(true);
    expect(Object.keys(schema.shape)).not.toContain(fieldKey({ id: "f-telefone" }));
  });
});

describe("buildSchema — on_date_automation_field", () => {
  it("exige data estrita AAAA-MM-DD", () => {
    const schema = buildSchema([dateAutomationField()]);
    expect(schema.safeParse({ [fieldKey({ id: "f4" })]: "2026-08-21" }).success).toBe(
      true,
    );
    expect(schema.safeParse({ [fieldKey({ id: "f4" })]: "21/08/2026" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ [fieldKey({ id: "f4" })]: "" }).success).toBe(false);
  });

  it("campo opcional aceita vazio", () => {
    const schema = buildSchema([dateAutomationField({ required: false })]);
    expect(schema.safeParse({ [fieldKey({ id: "f4" })]: "" }).success).toBe(true);
  });
});

describe("buildSchema — image_authorization", () => {
  it("sem a flag, não adiciona o campo de consentimento", () => {
    const schema = buildSchema([]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("com a flag, exige image_authorization = true", () => {
    const schema = buildSchema([], true);
    const missing = schema.safeParse({});
    expect(missing.success).toBe(false);

    const unchecked = schema.safeParse({ image_authorization: false });
    expect(unchecked.success).toBe(false);
    if (!unchecked.success) {
      expect(unchecked.error.issues[0].message).toBe(
        "Autorização de uso de imagem é obrigatória",
      );
    }

    expect(schema.safeParse({ image_authorization: true }).success).toBe(true);
  });

  it("defaultValues com a flag inclui image_authorization = false", () => {
    expect(defaultValues([], true).image_authorization).toBe(false);
    expect("image_authorization" in defaultValues([])).toBe(false);
  });
});
