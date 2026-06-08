"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MessageChannel,
  MessageTemplate,
  MessageTemplateWithAutomation,
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
] as const;

export function useTemplates(eventId: string) {
  return useQuery({
    queryKey: queryKeys.templates(eventId),
    queryFn: () => api.get<MessageTemplate[]>(`/events/${eventId}/templates`),
    enabled: Boolean(eventId),
  });
}

/** Templates com resumo da automação vinculada (GET ?include=automation) */
export function useTemplatesWithAutomation(eventId: string) {
  return useQuery({
    queryKey: [...queryKeys.templates(eventId), { include: "automation" }],
    queryFn: () =>
      api.get<MessageTemplateWithAutomation[]>(
        `/events/${eventId}/templates?include=automation`,
      ),
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
