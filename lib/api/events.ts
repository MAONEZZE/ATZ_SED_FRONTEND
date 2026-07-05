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
  description?: string;
  location?: string;
  capacity?: number;
  dressCode?: string;
  groupLink?: string;
  eventDate?: string;
  endDate?: string;
  recurrenceFreq?: RecurrenceFreq | null;
  recurrenceInterval?: number | null;
  recurrenceUntil?: string | null;
  postRegistrationMessage?: string;
  sendToPipedrive?: boolean;
}

export interface EventUpdateInput extends Partial<EventInput> {
  evolutionInstance?: string;
}

export function useEvents(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.events({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<EventObject>>(`/events?page=${page}&limit=${limit}`),
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
