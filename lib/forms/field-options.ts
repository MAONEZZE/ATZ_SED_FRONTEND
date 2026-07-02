/**
 * Normaliza as opções de um campo de formulário para uma lista de strings.
 * Aceita tanto `FormField` quanto `PublicFormField` (ambos expõem `options`).
 */
export function fieldOptions(field: { options?: unknown }): string[] {
  return Array.isArray(field.options)
    ? field.options.filter((o): o is string => typeof o === "string")
    : [];
}
