"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MessageChannel,
  MessageTemplate,
  MessageTemplateWithAutomation,
  PaginatedResponse,
} from "@/lib/api/types";

export interface TemplateInput {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
}

/** Variáveis disponíveis em body/subject (contrato) */
export const TEMPLATE_VARIABLES = [
  "nome",
  "email",
  "telefone",
  "evento",
  "data",
  "local",
  "capacidade",
  "dress_code",
  "link_grupo",
  "invite",
  "invite_recorrente",
] as const;

export function useTemplates(eventId: string) {
  return useQuery({
    queryKey: queryKeys.templates(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MessageTemplate>>(
        `/events/${eventId}/templates?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

/** Templates com resumo da automação vinculada (GET ?include=automation) */
export function useTemplatesWithAutomation(eventId: string) {
  return useQuery({
    queryKey: [...queryKeys.templates(eventId), { include: "automation" }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MessageTemplateWithAutomation>>(
        `/events/${eventId}/templates?include=automation&limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useCreateTemplate(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateInput) =>
      api.post<MessageTemplate>(`/events/${eventId}/templates`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(eventId) }),
  });
}

export function useUpdateTemplate(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TemplateInput> }) =>
      api.patch<MessageTemplate>(`/events/${eventId}/templates/${id}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(eventId) }),
  });
}

export function useDeleteTemplate(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${eventId}/templates/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(eventId) }),
  });
}
