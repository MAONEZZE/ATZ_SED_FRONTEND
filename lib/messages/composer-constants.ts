import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email-templates";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";

/** Valor sentinela do Select de template quando nenhum está escolhido. */
export const NO_TEMPLATE = "__none__";

/** Valor sentinela do Select de evento quando nenhum está vinculado. */
export const NO_EVENT = "__none_event__";

/** Altura mínima do iframe de preview de e-mail antes do autosize. */
export const EMAIL_PREVIEW_MIN_HEIGHT = "300px";

/** Classe do rótulo de etapa dos cards do compositor ("1 · Configuração"). */
export const STEP_LABEL_CLASS = "text-xs font-medium text-muted-foreground";

/** Opções de tom/preset de e-mail, derivadas dos presets de layout. */
export const TONE_OPTIONS = (Object.keys(EMAIL_LAYOUT_PRESETS) as EmailTemplateKey[]).map(
  (key) => ({ value: key, label: EMAIL_TEMPLATE_LABELS[key] }),
);

/**
 * True quando o corpo começa com uma tag HTML — usado para alternar entre
 * preview em iframe e textarea de texto. O regex precisa permanecer idêntico
 * nas duas superfícies (send-form e dialog) para o toggle não divergir.
 */
export function isBodyHtml(body: string): boolean {
  return /^<[a-zA-Z!]/.test(body.trim());
}
