export type EmailTemplateKey =
  | "minimalista"
  | "profissional"
  | "acolhedor"
  | "elegante";

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  minimalista: "Minimalista",
  profissional: "Profissional",
  acolhedor: "Acolhedor",
  elegante: "Elegante",
};
