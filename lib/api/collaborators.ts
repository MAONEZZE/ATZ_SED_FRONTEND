"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Collaborator } from "@/lib/api/types";

export function useCollaborators(eventId: string) {
  return useQuery({
    queryKey: queryKeys.collaborators(eventId),
    queryFn: () => api.get<Collaborator[]>(`/events/${eventId}/collaborators`),
    enabled: Boolean(eventId),
  });
}

export function useAddCollaborator(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.post<Collaborator>(`/events/${eventId}/collaborators`, { email }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.collaborators(eventId) }),
  });
}

export function useRemoveCollaborator(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      api.delete(`/events/${eventId}/collaborators/${profileId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.collaborators(eventId) }),
  });
}
