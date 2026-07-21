import type { AutomationTrigger } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  delayMinutes?: number;
  cron?: string;
  timezone?: string;
  active?: boolean;
}

export const DELAYED_TRIGGERS: AutomationTrigger[] = [];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever - Formulário Principal",
  on_post_event: "Ao se inscrever - Pós-evento",
  on_nps: "Ao se inscrever - NPS",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  recurring: "Recorrente (data/hora fixa)",
};
