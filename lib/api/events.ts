"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  EventObject,
  EventStatus,
  PaginatedResponse,
  RecurrenceFreq,
} from "@/lib/api/types";

export interface EventInput {
  title: string;
  location?: string;
  capacity?: number;
  dressCode?: string;
  groupLink?: string;
  eventDate?: string;
  endDate?: string;
  recurrenceFreq?: RecurrenceFreq | null;
  recurrenceInterval?: number | null;
  recurrenceUntil?: string | null;
  whatsappInstanceId?: string;
  whatsappToken?: string;
  folderId?: string | null;
}

export type EventUpdateInput = Partial<EventInput>;

export function useEvents(page = 1, limit = 20, folderId?: string | null) {
  return useQuery({
    queryKey: queryKeys.events({ page, limit, folderId }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      // O backend distingue a raiz da lista sem filtro: `folderId=null`
      // traz apenas eventos fora de pasta, enquanto a ausência do parâmetro
      // traz todos os eventos. Sem isso, um evento recém-movido reaparece na
      // grade principal após a invalidação do cache.
      if (folderId !== undefined) params.set("folderId", folderId ?? "null");
      return api.get<PaginatedResponse<EventObject>>(`/events?${params.toString()}`);
    },
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: limit > 0,
  });
}

export function useEvent(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => api.get<EventObject>(`/events/${id}`),
    enabled: Boolean(id),
    // Abre instantâneo: usa o evento já presente em qualquer lista cacheada como
    // dado inicial; refaz em background (updatedAt 0 = stale) para garantir dados
    // completos/atualizados.
    initialData: () => {
      const lists = queryClient.getQueriesData<PaginatedResponse<EventObject>>({
        queryKey: ["events"],
      });
      for (const [, data] of lists) {
        const list = data?.data;
        if (Array.isArray(list)) {
          const found = list.find((e) => e.id === id);
          if (found) return found;
        }
      }
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: EventInput) => api.post<EventObject>("/events", input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: EventUpdateInput) =>
      api.patch<EventObject>(`/events/${id}`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateEventStatus(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (status: EventStatus) =>
      api.patch<EventObject>(`/events/${id}/status`, { status }),
    onSuccess: () => invalidate(id),
  });
}

export function useUploadEventCover(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<EventObject>(`/events/${id}/cover`, formData);
    },
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteEventCover(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: () => api.delete<EventObject>(`/events/${id}/cover`),
    onSuccess: () => invalidate(id),
  });
}

export function useCancelEvent(id: string) {
  const invalidate = useInvalidateEvents();
  // Cancelamento é uma transição de status com efeito colateral (notificação):
  // o backend não expõe POST /cancel, e sim PATCH /status com status=cancelled.
  return useMutation({
    mutationFn: (notifyParticipants: boolean) =>
      api.patch<EventObject>(`/events/${id}/status`, {
        status: "cancelled",
        notifyParticipants,
      }),
    onSuccess: () => invalidate(id),
  });
}

export function useDuplicateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: string) => api.post<EventObject>(`/events/${id}/duplicate`),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => invalidate(),
  });
}

/**
 * Reordena um evento dentro da pasta atual ou o move para outra pasta.
 * O endpoint `/move` aceita somente `beforeId`; a pasta é alterada no endpoint
 * principal do evento.
 */
export function useMoveEvent() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: ({
      id,
      folderId,
      beforeId,
    }: {
      id: string;
      folderId?: string | null;
      beforeId?: string;
    }) => {
      if (folderId !== undefined) {
        return api.patch<EventObject>(`/events/${id}`, { folderId }).then(() => undefined);
      }
      return api.patch<void>(`/events/${id}/move`, {
        ...(beforeId ? { beforeId } : {}),
      });
    },
    onMutate: async ({ id, folderId, beforeId }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueriesData<PaginatedResponse<EventObject>>({
        queryKey: ["events"],
      });
      const moved = previous
        .flatMap(([, data]) => data?.data ?? [])
        .find((event) => event.id === id);
      if (!moved) return { previous };

      const targetFolderId = folderId ?? moved.folderId;
      for (const [key, data] of previous) {
        if (!data || !Array.isArray(data.data)) continue;
        const params = Array.isArray(key)
          ? (key[1] as { folderId?: string | null } | undefined)
          : undefined;
        const isTarget = params?.folderId === targetFolderId;
        let next = data.data.filter((event) => event.id !== id);
        if (isTarget) {
          const nextMoved = { ...moved, folderId: targetFolderId };
          const insertAt = beforeId
            ? next.findIndex((event) => event.id === beforeId)
            : -1;
          next =
            insertAt >= 0
              ? [...next.slice(0, insertAt), nextMoved, ...next.slice(insertAt)]
              : [...next, nextMoved];
        }
        queryClient.setQueryData<PaginatedResponse<EventObject>>(key, {
          ...data,
          data: next,
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: () => invalidate(),
  });
}
