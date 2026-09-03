"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
  folderId?: string | null;
}

interface TemplatesQuery {
  page: number;
  limit: number;
  channel?: MessageChannel;
  eventId?: string | null;
  folderId?: string | null;
}

function templatesQuery({ page, limit, channel, eventId, folderId }: TemplatesQuery) {
  return {
    queryKey: queryKeys.allTemplates({ page, limit, channel, eventId, folderId }),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (channel) qs.set("channel", channel);
      if (eventId !== undefined) qs.set("eventId", eventId === null ? "null" : eventId);
      if (folderId !== undefined) qs.set("folderId", folderId ?? "null");
      return api.get<PaginatedResponse<TemplateWithEvent>>(`/templates?${qs.toString()}`);
    },
  };
}

// eventId: undefined = sem filtro (todos os templates); null = envia o literal
// "null" ao backend (apenas templates globais); string = filtra exclusivamente
// pelo evento informado.
export function useAllTemplates(
  page = 1,
  limit = 20,
  channel?: MessageChannel,
  eventId?: string | null,
  folderId?: string | null,
) {
  return useQuery({
    ...templatesQuery({ page, limit, channel, eventId, folderId }),
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: limit > 0,
  });
}

/** Conteúdo das pastas abertas na tabela — uma consulta por pasta expandida. */
const FOLDER_TEMPLATES_LIMIT = 100;

export function useTemplatesInFolders(
  folderIds: string[],
  channel?: MessageChannel,
  eventId?: string | null,
) {
  const results = useQueries({
    queries: folderIds.map((folderId) =>
      templatesQuery({
        page: 1,
        limit: FOLDER_TEMPLATES_LIMIT,
        channel,
        eventId,
        folderId,
      }),
    ),
  });
  return new Map(
    folderIds.map((folderId, index) => [folderId, results[index]?.data?.data ?? []]),
  );
}

export function useEventAutomations(eventId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.automations(eventId, { page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<Automation>>(
        `/events/${eventId}/automations?page=${page}&limit=${limit}`,
      ),
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

/** Move um template antes de outro item da mesma pasta; sem `beforeId`, envia ao fim. */
export function useMoveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    // `/move` roda sob `forbidNonWhitelisted` e só aceita `beforeId` — mandar
    // `folderId` ali devolve "property folderId should not exist". A pasta vai
    // no PATCH do próprio template, como em `useMoveEvent`.
    mutationFn: async ({
      id,
      folderId,
      beforeId,
    }: {
      id: string;
      folderId: string | null;
      beforeId?: string;
    }) => {
      await api.patch<TemplateWithEvent>(`/templates/${id}`, { folderId });
      if (beforeId) await api.patch<void>(`/templates/${id}/move`, { beforeId });
    },
    onMutate: async ({ id, folderId, beforeId }) => {
      await queryClient.cancelQueries({ queryKey: ["global", "templates"] });
      const previous = queryClient.getQueriesData<PaginatedResponse<TemplateWithEvent>>({
        queryKey: ["global", "templates"],
      });
      const moved = previous
        .flatMap(([, data]) => data?.data ?? [])
        .find((template) => template.id === id);
      // Sem o template em mãos não dá para atualizar o cache: reconcilia com o
      // servidor no fim.
      if (!moved) return { previous, changedFolder: true };
      const changedFolder = (moved.folderId ?? null) !== folderId;

      for (const [key, data] of previous) {
        if (!data || !Array.isArray(data.data)) continue;
        const params = Array.isArray(key)
          ? (key[2] as { folderId?: string | null } | undefined)
          : undefined;
        if (params?.folderId === undefined) {
          queryClient.setQueryData<PaginatedResponse<TemplateWithEvent>>(key, {
            ...data,
            data: data.data.map((template) =>
              template.id === id ? { ...template, folderId } : template,
            ),
          });
          continue;
        }
        const isTarget = params?.folderId === folderId;
        let next = data.data.filter((template) => template.id !== id);
        if (isTarget) {
          const nextMoved = { ...moved, folderId };
          const insertAt = beforeId
            ? next.findIndex((template) => template.id === beforeId)
            : -1;
          next =
            insertAt >= 0
              ? [...next.slice(0, insertAt), nextMoved, ...next.slice(insertAt)]
              : [...next, nextMoved];
        }
        queryClient.setQueryData<PaginatedResponse<TemplateWithEvent>>(key, {
          ...data,
          data: next,
        });
      }
      return { previous, changedFolder };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    // Reordenar dentro da lista já fica exato no cache. Trocar de pasta pode
    // envolver uma lista que nem foi buscada ainda (a pasta abre no mesmo
    // gesto), então espera o servidor e reconcilia — é o que faz o template
    // aparecer na pasta sem depender de um refetch futuro.
    onSettled: (_data, error, _input, context) =>
      error || context?.changedFolder
        ? queryClient.invalidateQueries({ queryKey: ["global", "templates"] })
        : undefined,
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
