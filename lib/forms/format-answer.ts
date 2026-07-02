/** Formata o valor de uma resposta de formulário para exibição. */
export function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value == null || value === "") return "—";
  return String(value);
}
