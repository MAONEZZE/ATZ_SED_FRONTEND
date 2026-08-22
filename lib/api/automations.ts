import type { AutomationTrigger } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  formIds?: string[];
  cron?: string;
  timezone?: string;
  sendAt?: string;
  sendTime?: string;
  name?: string;
  folderId?: string | null;
  active?: boolean;
}

/** @deprecated Sem gatilho com atraso hoje — removido junto da reescrita do dialog em F6. */
export const DELAYED_TRIGGERS: AutomationTrigger[] = [];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever",
  on_form_submitted: "Ao enviar um formulário",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  recurring: "Recorrente (data/hora fixa)",
  on_date: "Em uma data específica",
  on_date_form_field: "Em uma data informada no formulário",
};
