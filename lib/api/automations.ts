import type { AutomationTrigger } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  delayMinutes?: number;
  active?: boolean;
}

export const DELAYED_TRIGGERS: AutomationTrigger[] = ["after_approval", "before_event", "after_event"];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever - Formulário Principal",
  on_post_event: "Ao se inscrever - Pós-evento",
  on_nps: "Ao se inscrever - NPS",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  after_approval: "Depois de aprovado (com atraso)",
  before_event: "Antes do evento",
  after_event: "Depois do evento",
};
