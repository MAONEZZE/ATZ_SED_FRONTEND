"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { EventObject, EventStatus } from "@/lib/api/types";

export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  capacity?: number;
  dressCode?: string;
  groupLink?: string;
  eventDate?: string;
  endDate?: string;
  postRegistrationMessage?: string;
}

export interface EventUpdateInput extends Partial<EventInput> {
  evolutionInstance?: string;
  evolutionToken?: string;
}

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: () => api.get<EventObject[]>("/events"),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => api.get<EventObject>(`/events/${id}`),
    enabled: Boolean(id),
  });
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.events });
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
  return useMutation({
    mutationFn: (notifyParticipants: boolean) =>
      api.post<EventObject>(`/events/${id}/cancel`, { notifyParticipants }),
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
