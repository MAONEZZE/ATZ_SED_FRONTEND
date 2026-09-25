import type { FieldType } from "@/lib/api/types";

/**
 * Registry por tipo de campo — fonte única da lógica type-keyed de formulários
 * (parsing de opções, formatação de resposta, regras de render compartilhadas).
 * A renderização dos inputs em si fica em cada consumidor: o formulário público
 * (form-fields-renderer) e a edição inline do admin (attendee-detail-dialog)
 * diferem materialmente (DateTimePicker vs input nativo, radio vs dropdown,
 * upload vs leitura), então forçar um render único aqui prejudicaria a leitura.
 */

/** Máx. de opções para "escolha única" renderizar como radio em vez de dropdown. */
export const SELECT_RADIO_MAX = 4;

export interface FieldTypeSpec {
  /** Usa a lista `options` do campo (escolha única/múltipla). */
  hasOptions: boolean;
}

export const FIELD_TYPES: Record<FieldType, FieldTypeSpec> = {
  text: { hasOptions: false },
  textarea: { hasOptions: false },
  email: { hasOptions: false },
  phone: { hasOptions: false },
  select: { hasOptions: true },
  multiselect: { hasOptions: true },
  checkbox: { hasOptions: false },
  document: { hasOptions: false },
  date: { hasOptions: false },
  linkedin: { hasOptions: false },
  instagram: { hasOptions: false },
  on_date_automation_field: { hasOptions: false },
};

/** O tipo usa a lista de opções? (escolha única/múltipla) */
export function fieldHasOptions(type: FieldType): boolean {
  return FIELD_TYPES[type].hasOptions;
}

/**
 * Normaliza as opções de um campo para uma lista de strings.
 * Aceita tanto `FormField` quanto `PublicFormField` (ambos expõem `options`).
 */
export function fieldOptions(field: { options?: unknown }): string[] {
  return Array.isArray(field.options)
    ? field.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")
    : [];
}

/** Limite configurado para um campo de documento; legado/ausente equivale a 1. */
export function documentMaxFiles(field: { options?: unknown }): number {
  if (
    !field.options ||
    typeof field.options !== "object" ||
    Array.isArray(field.options)
  ) {
    return 1;
  }
  const value = (field.options as { maxFiles?: unknown }).maxFiles;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 1;
}

/** Escolha única com poucas opções vira radio; com muitas, dropdown. */
export function rendersAsRadioGroup(options: string[]): boolean {
  return options.length <= SELECT_RADIO_MAX;
}

/** Formata o valor de uma resposta de formulário para exibição. */
export function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object" && "name" in item
          ? String((item as { name: unknown }).name)
          : String(item),
      )
      .join(", ");
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value == null || value === "") return "—";
  return String(value);
}
