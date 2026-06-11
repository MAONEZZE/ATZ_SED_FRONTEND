"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AutomationWithEvent,
  MessageLogWithEvent,
  PaginatedResponse,
  TemplateWithEvent,
} from "@/lib/api/types";
import type { TemplateInput } from "@/lib/api/templates";
import type { AutomationInput } from "@/lib/api/automations";

/* ---------- Queries agregadas (todos os eventos do usuário) ---------- */

export function useAllTemplates(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.allTemplates({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<TemplateWithEvent>>(
        `/templates?page=${page}&limit=${limit}`,
      ),
  });
}

export function useAllAutomations(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.allAutomations({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<AutomationWithEvent>>(
        `/automations?page=${page}&limit=${limit}`,
      ),
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

/* ---------- Mutations (CRUD escolhendo o evento no payload) ---------- */

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
    // eventId null/"" → template global (rota /messaging/templates aceita eventId null)
    mutationFn: ({
      eventId,
      input,
    }: {
      eventId: string | null;
      input: TemplateInput;
    }) =>
      eventId
        ? api.post(`/events/${eventId}/templates`, input)
        : api.post(`/messaging/templates`, { ...input, eventId: null }),
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
        : api.patch(`/messaging/templates/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplateGlobal() {
  const invalidate = useInvalidateGlobal();
  return useMutation({
    mutationFn: ({ eventId, id }: { eventId: string | null; id: string }) =>
      eventId
        ? api.delete(`/events/${eventId}/templates/${id}`)
        : api.delete(`/messaging/templates/${id}`),
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
