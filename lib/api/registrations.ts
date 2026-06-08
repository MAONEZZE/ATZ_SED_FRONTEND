"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FunnelStatus, Registration } from "@/lib/api/types";

/** Baixa o CSV de inscrições (mesmos filtros da listagem) */
export function exportRegistrationsCsv(
  eventId: string,
  filters: { status?: FunnelStatus; search?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();
  return apiFetchBlob(
    `/events/${eventId}/registrations/export${query ? `?${query}` : ""}`,
  );
}

export function useRegistrations(eventId: string, status?: FunnelStatus) {
  return useQuery({
    queryKey: queryKeys.registrations(eventId, status),
    queryFn: () =>
      api.get<Registration[]>(
        `/events/${eventId}/registrations${status ? `?status=${status}` : ""}`,
      ),
    enabled: Boolean(eventId),
  });
}

export function useUpdateRegistrationStatus(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FunnelStatus }) =>
      api.patch<Registration>(`/events/${eventId}/registrations/${id}/status`, {
        status,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "registrations"],
      }),
  });
}
