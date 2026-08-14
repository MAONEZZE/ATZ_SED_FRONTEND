"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Automation,
  MessageChannel,
  MessageLogWithEvent,
  PaginatedResponse,
  TemplateWithEvent,
} from "@/lib/api/types";
import type { AutomationInput } from "@/lib/api/automations";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";

export interface TemplateInput {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  layoutConfig?: EmailLayoutConfig | null;
  styleKey?: EmailTemplateKey | null;
  /** Vincula o template a um evento. null = global (sem evento). */
  eventId?: string | null;
}

// eventId: undefined = sem filtro (todos os templates); null = envia o literal
// "null" ao backend (apenas templates globais); string = filtra exclusivamente
// pelo evento informado (NÃO soma com os globais — precisa de duas chamadas
// para combinar "globais + este evento", ver event-automation-dialog.tsx).
export function useAllTemplates(
  page = 1,
  limit = 20,
  channel?: MessageChannel,
  eventId?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.allTemplates({ page, limit, channel, eventId }),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (channel) qs.set("channel", channel);
      if (eventId !== undefined) qs.set("eventId", eventId === null ? "null" : eventId);
      return api.get<PaginatedResponse<TemplateWithEvent>>(`/templates?${qs.toString()}`);
    },
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: limit > 0,
  });
}

export function useEventAutomations(eventId: string) {
  return useQuery({
    queryKey: queryKeys.automations(eventId),
    queryFn: () =>
      api.get<PaginatedResponse<Automation>>(`/events/${eventId}/automations`),
    enabled: Boolean(eventId),
  });
}

/** Logs de um evento (`eventId`) ou de todos os eventos do usuário (sem `eventId`). */
export function useMessageLogs({
  eventId,
  page = 1,
  limit = 30,
}: {
  eventId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: eventId
      ? queryKeys.messageLogs(eventId, { page, limit })
      : queryKeys.allMessageLogs({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<MessageLogWithEvent>>(
        eventId
          ? `/events/${eventId}/message-logs?page=${page}&limit=${limit}`
          : `/messaging/logs?page=${page}&limit=${limit}`,
      ),
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: limit > 0,
  });
}

function useInvalidateGlobal() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["global"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };
}

export function useCreateTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ input }: { input: TemplateInput }) =>
      api.post(`/messaging/templates`, input),
    onSuccess: invalidate,
  });
}

// O endpoint global resolve por id + ownerId e aplica o eventId que vier no
// corpo — não existe rota /events/:eventId/templates/:id no backend.
export function useUpdateTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TemplateInput> }) =>
      api.patch(`/templates/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/templates/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateAutomationGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: AutomationInput }) =>
      api.post(`/events/${eventId}/automations`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateAutomationGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({
      eventId,
      id,
      input,
    }: {
      eventId: string;
      id: string;
      input: Partial<AutomationInput>;
    }) => api.patch(`/events/${eventId}/automations/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAutomationGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ eventId, id }: { eventId: string; id: string }) =>
      api.delete(`/events/${eventId}/automations/${id}`),
    onSuccess: invalidate,
  });
}
