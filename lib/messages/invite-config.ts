import type { InvitePayload, InviteRecurrencePayload } from "@/lib/api/types";

export type InviteRecurrence = "none" | "daily" | "weekly" | "monthly" | "custom";

export interface InviteConfig {
  /** "YYYY-MM-DD" */
  date: string;
  allDay: boolean;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  /** IANA timezone id */
  timezone: string;
  recurrence: InviteRecurrence;
  /** Só usados quando recurrence === "custom". */
  customFreq: InviteRecurrencePayload["freq"];
  interval: number;
  /** "YYYY-MM-DD" — vazio = sem data final. */
  until: string;
}

export const CUSTOM_FREQ_OPTIONS: {
  value: InviteRecurrencePayload["freq"];
  label: string;
}[] = [
  { value: "DAILY", label: "Dia(s)" },
  { value: "WEEKLY", label: "Semana(s)" },
  { value: "MONTHLY", label: "Mês(es)" },
  { value: "YEARLY", label: "Ano(s)" },
];

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const ORDINALS = ["primeira", "segunda", "terceira", "quarta", "quinta"];

/** Timezone padrão do sistema: São Paulo, Brasil (GMT-3). */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/** Timezones oferecidas no dropdown do modal de invite. */
export const TIMEZONE_OPTIONS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Rio_Branco",
  "America/Noronha",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Lisbon",
  "UTC",
];

/** Rótulo curto "GMT-3" para uma timezone numa data. */
export function timezoneLabel(tz: string, ref: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(ref);
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    return name ?? tz;
  } catch {
    return tz;
  }
}

function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatInviteDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return "Selecione uma data";
  const weekday = WEEKDAYS[d.getDay()];
  const label = `${weekday}, ${d.getDate()} de ${d.toLocaleDateString("pt-BR", {
    month: "long",
  })}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Opções de recorrência derivadas da data escolhida (padrão Google Calendar). */
export function recurrenceOptions(
  dateStr: string,
): { value: InviteRecurrence; label: string }[] {
  const d = parseLocalDate(dateStr);
  const weekday = d ? WEEKDAYS[d.getDay()] : "";
  const ordinal = d ? ORDINALS[Math.min(Math.ceil(d.getDate() / 7), 5) - 1] : "";
  return [
    { value: "none", label: "Não se repete" },
    { value: "daily", label: "Todos os dias" },
    {
      value: "weekly",
      label: weekday ? `Semanal: cada ${weekday}` : "Semanal",
    },
    {
      value: "monthly",
      label: d ? `Mensal: ${ordinal} ${weekday}` : "Mensal",
    },
    { value: "custom", label: "Personalizado..." },
  ];
}

export function isRecurrentInvite(recurrence: InviteRecurrence): boolean {
  return recurrence !== "none";
}

const PRESET_FREQ_MAP: Record<"daily" | "weekly" | "monthly", InviteRecurrencePayload["freq"]> =
  {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
  };

/** Converte "YYYY-MM-DD" para ISO 8601 no fim do dia (inclui o último dia inteiro). */
function untilToIso(until: string): string | undefined {
  if (!until) return undefined;
  const d = new Date(`${until}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Converte a config do modal no objeto `invite` do payload de envio. */
export function toInvitePayload(config: InviteConfig): InvitePayload {
  let recurrence: InvitePayload["recurrence"] = null;
  if (config.recurrence === "custom") {
    recurrence = {
      freq: config.customFreq,
      interval: config.interval >= 1 ? config.interval : 1,
      until: untilToIso(config.until),
    };
  } else if (config.recurrence !== "none") {
    recurrence = { freq: PRESET_FREQ_MAP[config.recurrence], interval: 1 };
  }
  return {
    date: config.date,
    allDay: config.allDay,
    startTime: config.allDay ? undefined : config.startTime,
    endTime: config.allDay ? undefined : config.endTime,
    timezone: config.timezone,
    recurrence,
  };
}

/** Token inserido no corpo conforme a recorrência escolhida. */
export function inviteToken(recurrence: InviteRecurrence): string {
  return isRecurrentInvite(recurrence) ? "{{invite_recorrente}}" : "{{invite}}";
}

/** Resumo curto do invite para o rail (ex.: "Recorrente · Semanal: cada quarta-feira"). */
export function describeInvite(config: InviteConfig): string {
  const opt = recurrenceOptions(config.date).find((o) => o.value === config.recurrence);
  const kind = isRecurrentInvite(config.recurrence) ? "Recorrente" : "Único";
  return opt ? `${kind} · ${opt.label}` : kind;
}
