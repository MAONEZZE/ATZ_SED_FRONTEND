"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Collaborator, EventRole } from "@/lib/api/types";

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
    mutationFn: ({ email, role }: { email: string; role: EventRole }) =>
      api.post<Collaborator>(`/events/${eventId}/collaborators`, { email, role }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.collaborators(eventId) }),
  });
}

export function useUpdateCollaboratorRole(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: EventRole }) =>
      api.patch<Collaborator>(`/events/${eventId}/collaborators/${profileId}`, {
        role,
      }),
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
