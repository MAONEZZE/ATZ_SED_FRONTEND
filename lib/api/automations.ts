import { cronEquivalent } from "@/lib/utils/automation-cron";
import type { AutomationTrigger, Form } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  formIds?: string[];
  cron?: string | null;
  timezone?: string | null;
  sendAt?: string;
  sendTime?: string;
  name?: string;
  folderId?: string | null;
  active?: boolean;
}

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever",
  on_form_submitted: "Ao enviar um formulário",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  recurring: "Recorrente (data/hora fixa)",
  on_date: "Em uma data específica",
  on_date_form_field: "Em uma data informada no formulário",
};

/** Únicos gatilhos em que o backend exige `formIds` não-vazio. */
export const REQUIRES_FORM_TRIGGERS: AutomationTrigger[] = [
  "on_form_submitted",
  "on_date_form_field",
];

export function triggerRequiresForm(trigger: AutomationTrigger): boolean {
  return REQUIRES_FORM_TRIGGERS.includes(trigger);
}

/**
 * `on_registration`/`on_form_submitted` escopam por submissão (o formulário
 * pelo qual o inscrito entrou); os demais escopam por participação (quem
 * respondeu aquele formulário, via FormResponse — inclui quem já estava
 * inscrito por outro formulário).
 */
export const SUBMISSION_SCOPE_TRIGGERS: AutomationTrigger[] = [
  "on_registration",
  "on_form_submitted",
];

export function triggerUsesSubmissionScope(trigger: AutomationTrigger): boolean {
  return SUBMISSION_SCOPE_TRIGGERS.includes(trigger);
}

/**
 * Motivo (em pt-BR) pelo qual `form` não pode ser selecionado para `trigger`,
 * ou `null` se for válido. `formIdsWithDateField` vem de agrupar
 * `useFormFields(eventId)` (sem `formId`) por `FormField.formId` onde
 * `type === "on_date_automation_field"`.
 */
export function invalidAutomationFormReason(
  form: Pick<Form, "id" | "anonymous">,
  trigger: AutomationTrigger,
  formIdsWithDateField: ReadonlySet<string>,
): string | null {
  if (form.anonymous) {
    return "formulário anônimo";
  }
  if (trigger === "on_date_form_field" && !formIdsWithDateField.has(form.id)) {
    return "sem campo de automação por data";
  }
  return null;
}

export function sameFormIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

export interface AutomationSnapshot {
  templateId: string;
  trigger: AutomationTrigger;
  formIds: string[];
  cron: string | null;
  timezone: string | null;
  /** Só relevante quando `trigger === "on_date"`. */
  sendAt: string | null;
  active: boolean;
}

/**
 * Monta o corpo do PATCH comparando `current` contra `original` (o snapshot
 * carregado do GET): campo inalterado não entra na chave — é assim que uma
 * automação `on_date_form_field` legada sem formulário sobrevive a um PATCH
 * que só muda `active`, sem nunca mandar `formIds: []` e tomar 400.
 *
 * `cron`/`timezone` são exceção: ao sair do gatilho `recurring` eles não
 * limpam sozinhos no backend, então valor `null` explícito é enviado sempre
 * que o efetivo (recorrente ou não) mudar. `sendAt` não precisa disso — o
 * service já limpa sozinho ao trocar de gatilho — por isso só entra no PATCH
 * quando o gatilho atual é `on_date`.
 */
export function buildAutomationPatch(
  original: AutomationSnapshot,
  current: AutomationSnapshot,
): Partial<AutomationInput> {
  const patch: Partial<AutomationInput> = {};

  if (current.templateId !== original.templateId) {
    patch.templateId = current.templateId;
  }
  if (current.trigger !== original.trigger) {
    patch.trigger = current.trigger;
  }
  if (!sameFormIds(current.formIds, original.formIds)) {
    patch.formIds = current.formIds;
  }
  if (!cronEquivalent(current.cron, original.cron)) {
    patch.cron = current.cron;
  }
  if (current.timezone !== original.timezone) {
    patch.timezone = current.timezone;
  }
  if (current.trigger === "on_date" && !sameInstant(current.sendAt, original.sendAt)) {
    patch.sendAt = current.sendAt ?? undefined;
  }
  if (current.active !== original.active) {
    patch.active = current.active;
  }

  return patch;
}
