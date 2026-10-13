import { cronEquivalent } from "@/lib/utils/automation-cron";
import type {
  Automation,
  AutomationTrigger,
  DelayDirection,
  DelayUnit,
  EventObject,
  Form,
} from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  formIds?: string[];
  cron?: string | null;
  timezone?: string | null;
  sendAt?: string;
  sendTime?: string;
  delayDirection?: DelayDirection;
  delayValue?: number;
  delayUnit?: DelayUnit;
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
  on_event_delay: "Delay (antes/depois do evento)",
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
  /** Só relevantes quando `trigger === "on_event_delay"`. */
  delayDirection?: DelayDirection | null;
  delayValue?: number | null;
  delayUnit?: DelayUnit | null;
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
 *
 * Os campos de delay seguem a mesma ideia: só entram quando o gatilho atual é
 * `on_event_delay`. Ao trocar *para* esse gatilho o backend exige os 3 no mesmo
 * PATCH; ao sair dele, ele os zera sozinho.
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
  if (current.trigger === "on_event_delay") {
    const switching = original.trigger !== "on_event_delay";
    if (switching || current.delayDirection !== original.delayDirection) {
      patch.delayDirection = current.delayDirection ?? undefined;
    }
    if (switching || current.delayValue !== original.delayValue) {
      patch.delayValue = current.delayValue ?? undefined;
    }
    if (switching || current.delayUnit !== original.delayUnit) {
      patch.delayUnit = current.delayUnit ?? undefined;
    }
  }
  if (current.active !== original.active) {
    patch.active = current.active;
  }

  return patch;
}

/**
 * O backend só revalida data do evento / momento no futuro quando o PATCH muda
 * o delay, ativa a regra ou troca para `on_event_delay`. Renomear, mover de
 * pasta ou mudar `formIds` passa mesmo com o momento no passado.
 */
export function patchRevalidatesDelay(patch: Partial<AutomationInput>): boolean {
  return (
    patch.trigger === "on_event_delay" ||
    patch.active === true ||
    patch.delayDirection !== undefined ||
    patch.delayValue !== undefined ||
    patch.delayUnit !== undefined
  );
}

// ---------------------------------------------------------------------------
// on_event_delay
// ---------------------------------------------------------------------------

const UNIT_MS: Record<DelayUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  // 1 dia = 24h exatas (não segue horário de verão), igual ao backend.
  days: 86_400_000,
};

const MAX_DELAY_MS = 365 * UNIT_MS.days;

export const DELAY_DIRECTION_LABELS: Record<DelayDirection, string> = {
  before: "Antes do início do evento",
  after: "Depois do fim do evento",
};

export const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
  minutes: "Minutos",
  hours: "Horas",
  days: "Dias",
};

export interface EventDelay {
  delayDirection: DelayDirection | null;
  delayValue: number | null;
  delayUnit: DelayUnit | null;
}

type EventDates = Pick<EventObject, "eventDate" | "endDate">;

/**
 * Momento do disparo: `eventDate − delay` (before) ou `(endDate ?? eventDate) +
 * delay` (after). `null` quando o evento não tem data ou o delay está incompleto.
 */
export function computeEventDelayFireAt(event: EventDates, delay: EventDelay): Date | null {
  const { delayDirection, delayValue, delayUnit } = delay;
  if (!event.eventDate || !delayDirection || !delayValue || !delayUnit) return null;
  const offset = delayValue * UNIT_MS[delayUnit];
  if (delayDirection === "before") {
    return new Date(new Date(event.eventDate).getTime() - offset);
  }
  return new Date(new Date(event.endDate ?? event.eventDate).getTime() + offset);
}

/** Espelha a validação do backend; `null` = válido. */
export function validateEventDelay(delay: EventDelay): string | null {
  const { delayDirection, delayValue, delayUnit } = delay;
  if (!delayDirection) return "Selecione se o disparo é antes ou depois do evento";
  if (delayValue === null || Number.isNaN(delayValue)) return "Informe o valor do delay";
  if (!Number.isInteger(delayValue) || delayValue < 1) {
    return "O valor do delay deve ser um número inteiro maior ou igual a 1";
  }
  if (!delayUnit) return "Selecione a unidade do delay";
  if (delayValue * UNIT_MS[delayUnit] > MAX_DELAY_MS) return "O delay máximo é de 365 dias";
  return null;
}

const UNIT_NOUNS: Record<DelayUnit, [string, string]> = {
  minutes: ["minuto", "minutos"],
  hours: ["hora", "horas"],
  days: ["dia", "dias"],
};

/** Ex.: "2 horas antes do início do evento", "1 dia depois do fim do evento". */
export function formatDelaySummary(delay: EventDelay): string {
  const { delayDirection, delayValue, delayUnit } = delay;
  if (!delayDirection || !delayValue || !delayUnit) return "";
  const noun = UNIT_NOUNS[delayUnit][delayValue === 1 ? 0 : 1];
  const ref = delayDirection === "before" ? "antes do início" : "depois do fim";
  return `${delayValue} ${noun} ${ref} do evento`;
}

export type EventDelayStatus = "pending" | "fired" | "no_date";

/**
 * "Disparada" só quando `firedForAt` bate com o momento calculado *agora*: se o
 * evento foi remarcado ou o delay editado, o momento muda e a regra volta a
 * aguardar. Compara instantes (ms), não strings ISO.
 */
export function eventDelayStatus(
  automation: Pick<Automation, keyof EventDelay | "firedForAt">,
  event: EventDates,
): EventDelayStatus {
  const fireAt = computeEventDelayFireAt(event, automation);
  if (!fireAt) return "no_date";
  if (
    automation.firedForAt &&
    new Date(automation.firedForAt).getTime() === fireAt.getTime()
  ) {
    return "fired";
  }
  return "pending";
}

/** O 409 do backend vem em inglês; o resto já vem em pt-BR. */
export function translateAutomationError(message: string): string {
  if (/an active automation with this template/i.test(message)) {
    return "Já existe uma automação ativa com este template e este delay neste evento.";
  }
  return message;
}
