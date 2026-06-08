"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Automation, AutomationTrigger, PaginatedResponse } from "@/lib/api/types";

export interface AutomationInput {
  templateId: string;
  trigger: AutomationTrigger;
  delayMinutes?: number;
  active?: boolean;
}

/** Triggers com delayMinutes (contrato) */
export const DELAYED_TRIGGERS: AutomationTrigger[] = [
  "before_event",
  "after_event",
  "after_approval",
];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever",
  on_screening: "Ao entrar em triagem",
  on_qualification: "Ao entrar em qualificação",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  on_waitlist: "Ao entrar na lista de espera",
  after_approval: "Após aprovação (com atraso)",
  before_event: "Antes do evento",
  after_event: "Depois do evento",
};

export function useAutomations(eventId: string) {
  return useQuery({
    queryKey: queryKeys.automations(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Automation>>(
        `/events/${eventId}/automations?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useCreateAutomation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AutomationInput) =>
      api.post<Automation>(`/events/${eventId}/automations`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automations(eventId) }),
  });
}

export function useUpdateAutomation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AutomationInput> }) =>
      api.patch<Automation>(`/events/${eventId}/automations/${id}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automations(eventId) }),
  });
}

export function useDeleteAutomation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${eventId}/automations/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automations(eventId) }),
  });
}
