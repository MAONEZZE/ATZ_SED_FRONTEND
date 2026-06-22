import type { AutomationTrigger } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  delayMinutes?: number;
  active?: boolean;
}

export const DELAYED_TRIGGERS: AutomationTrigger[] = ["before_event", "after_event"];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever",
  on_post_event: "Ao enviar formulário pós-evento",
  on_nps: "Ao enviar NPS",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  before_event: "Antes do evento",
  after_event: "Depois do evento",
};
