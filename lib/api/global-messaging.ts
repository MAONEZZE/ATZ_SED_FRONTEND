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

export function useAllMessageLogs(page = 1, limit = 30) {
  return useQuery({
    queryKey: queryKeys.allMessageLogs({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<MessageLogWithEvent>>(
        `/messaging/logs?page=${page}&limit=${limit}`,
      ),
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

export function useUpdateTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({
      eventId,
      id,
      input,
    }: {
      eventId: string | null;
      id: string;
      input: Partial<TemplateInput>;
    }) =>
      eventId
        ? api.patch(`/events/${eventId}/templates/${id}`, input)
        : api.patch(`/templates/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ eventId, id }: { eventId: string | null; id: string }) =>
      eventId
        ? api.delete(`/events/${eventId}/templates/${id}`)
        : api.delete(`/templates/${id}`),
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
